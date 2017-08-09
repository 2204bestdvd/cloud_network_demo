import * as d3 from "d3";

export interface Coordinate {
  x: number;
  y: number;
};

export interface Connection {
  source: number;
  destination: number;
};

export interface Flow {
  source: number;
  destination: number;
  service: number;
  numStage: number;
  rate: number;
}

export interface PoissonGenerator {
  pidName: string;
  rate: number;
}

export class Node {
  id: number;
  /** List of input links. */
  inputLinks: Link[] = [];
  /** List of output links. */
  outputLinks: Link[] = [];
  /** Coordinates  */
  x: number;
  y: number;

  // control policy
  policy = 'DCNC';
  V = 1.0;
  g = (x: number) => 0.9 * Math.pow(x, 0.9);

  // parameters
  processCost = 1;
  resourceToCost = (x: number) => x*(x+1)/2;
  resourceToCapacity = (x: number) => x;
  maxResource = 4;
  reconfigurationDelay = 10;
  reconfigurationCost = 0;

  // packet queues
  queues: {[name:string]: number} = {};
  arrivalGenerators: PoissonGenerator[] = [];

  // records configuration
	numResource = 0;
	packetID:PacketID = null;

  // records reconfiguration status
  timeRemainReconfiguration = 0;

  /**
   * Creates a new node with the provided id
   */
  constructor(id: number, coor: Coordinate, policy:string, V:number) {
    this.id = id;
    this.x = coor.x;
    this.y = coor.y;
    this.policy = policy;
    this.V = V;
  }
  initQueues() {
    for (let i = 0; i < PacketID.packetIDs.length; i++) {
      this.queues[PacketID.packetIDs[i].name] = 0;
    }
    console.log(d3.entries(this.queues));
  }

  allocate(numResource:number, packetID:PacketID) {
    if (numResource != this.numResource) {
      this.numResource = numResource;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
    if (!PacketID.isEqual(packetID, this.packetID)) {
      this.packetID = packetID;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
  }
  process() {
    if (this.timeRemainReconfiguration > 0) return;
    if (this.packetID != null) {
      let numProcess = Math.min(this.queues[this.packetID.name],
                                this.resourceToCapacity(this.numResource));
      // Todo: only packets that are in the queue at the beginning of the slot
      this.queues[this.packetID.name] -= numProcess;
      if (this.packetID.nextPID.nextPID != null
          || this.packetID.destination != this.id) {
        this.queues[this.packetID.nextPID.name] += numProcess;
      }
    }
  }

  processAndTransmit() {
    this.process();
    for (let l = 0; l < this.outputLinks.length; l++) {
      this.outputLinks[l].transmit();
    }
  }
  schedule() {
    let opt;
    switch(this.policy) {
      case 'DCNC':
        opt = this.maxWeight('process');
        this.allocate(opt.resource, opt.pid);

        for (let l = 0; l < this.outputLinks.length; l++) {
          opt = this.maxWeight('transmission', this.outputLinks[l]);
          this.outputLinks[l].allocate(opt.resource, opt.pid);
        }
        break;
      case 'ADCNC':
        let current;
        opt = this.maxWeight('process');
        current = this.weight('process');
        if (opt.maxWeight - current.weight
            > this.g(opt.maxQueueDiff * this.resourceToCapacity(this.numResource))) {
          this.allocate(opt.resource, opt.pid);
        } else {
          if (current.queueDiff <= 0) {
            this.allocate(0, null);
          }
        }

        for (let l = 0; l < this.outputLinks.length; l++) {
          opt = this.maxWeight('transmission', this.outputLinks[l]);
          current = this.weight('transmission', this.outputLinks[l]);
          if (opt.maxWeight - current.weight
              > this.g(opt.maxQueueDiff * this.resourceToCapacity(this.outputLinks[l].numResource))) {
            this.outputLinks[l].allocate(opt.resource, opt.pid);
          } else {
            if (current.queueDiff <= 0) {
              this.outputLinks[l].allocate(0, null);
            }
          }
        }
        break;
      default:
        throw Error("Unknown policy");
    }
  }
  maxWeight(func:string, link:Link = null) {
    // Let the score defined as [Q_i - Q_j - Ve]^+
    let maxDiff = 0;
    let maxScore = -1;
    let score: number;
    let optimalPID: PacketID;

    for (let name in this.queues) {
      let pid = PacketID.getPIDfromName(name);
      let diff = this.queueDifference(pid, func, link);
      if (diff != null) {
        score = Math.max(0, diff - this.V * this.processCost);
        if (score > maxScore) {
          optimalPID = pid;
          maxScore = score;
          maxDiff = diff;
        }
      }
    }

    // Determine optimal resource allocation
    let maxResource;
    switch (func) {
      case 'process':
        maxResource = this.maxResource;
        break;
      case 'transmission':
        if (link == null) {
          throw Error("Neighbor not specified");
        }
        maxResource = link.maxResource;
        break;
      default:
        throw Error("Unknown type of function");
    }

    let maxWeight = 0;
    let weight: number;
    let optimalResource = 0;
    for (let k = 0; k <= maxResource; k++) {
      weight = this.resourceToCapacity(k) * maxScore - this.V * this.resourceToCost(k);
      if (weight > maxWeight) {
        optimalResource = k;
        maxWeight = weight;
      }
    }
    return {'pid': optimalPID, 'resource': optimalResource,
            'maxQueueDiff':maxDiff, 'maxWeight': maxWeight};
  }

  weight(func:string, link:Link = null) {
    let pid = this.packetID;
    let k = this.numResource;
    if (pid == null || k == 0) {
      return {'queueDiff': 0, 'weight': 0};
    }
    let diff = this.queueDifference(pid, func, link);
    if (diff == null) diff = 0;
    let score = Math.max(0, diff - this.V * this.processCost);
    let weight = this.resourceToCapacity(k) * score - this.V * this.resourceToCost(k);
    return {'queueDiff': diff, 'weight': weight};
  }

  queueDifference(pid:PacketID, func:string, link:Link = null) :number {
    switch (func) {
      case 'process':
        if (pid.nextPID == null) {
          return null;
        }
        return this.queues[pid.name] - this.queues[pid.nextPID.name];
      case 'transmission':
        if (link == null) {
          throw Error("Neighbor not specified");
        }
        return this.queues[pid.name] - link.destination.queues[pid.name];
      default:
        throw Error("Unknown type of function");
    }
  }

}


export class PacketID {
  destination: number;
  service: number;
  stage: number;
  numStage: number;
  name: string;
  nextPID: PacketID;

  constructor(dest: number, service: number, stage: number, numStage: number) {
    this.destination = dest;
    this.service = service;
    this.stage = stage;
    this.numStage = numStage;
    this.name = dest.toString()
                .concat("_", service.toString(), "_", stage.toString());
  }
  assignNextPID() {
    if (this.stage < this.numStage) {
      let name = this.destination.toString()
                  .concat("_", this.service.toString(), "_", (this.stage+1).toString());
      this.nextPID = PacketID.getPIDfromName(name);
    }
  }

  public static packetIDs: PacketID[];

  public static getPIDfromName(name: string) :PacketID {
    for (let i = 0; i < PacketID.packetIDs.length; i++) {
      if (PacketID.packetIDs[i].name == name) {
        return PacketID.packetIDs[i];
      }
    }
    return null;
  }
  public static isEqual(pid1: PacketID, pid2: PacketID) {
    if (pid1 == null || pid2 == null) {
      if (pid1 == null && pid2 == null) return true;
      else return false;
    }
    if (pid1.name == pid2.name) return true;
    else return false;
  }
  public static reset(flows: Flow[]) {
    // Reconstruct list of packet IDs
    PacketID.packetIDs = [];
    for (let f in flows) {
      for (let s = 0; s <= flows[f].numStage; s++) {
        PacketID.packetIDs.push(new PacketID(flows[f].destination, flows[f].service,
                                              s, flows[f].numStage));
      }
    }
    // Assign next PID for each PID
    for (let i = 0; i < PacketID.packetIDs.length; i++) {
      PacketID.packetIDs[i].assignNextPID();
    }
  }
}



export class Link {
  id: string;
  source: Node;
  destination: Node;


  // parameters
  transmissionCost = 1;
  resourceToCost = (x: number) => x*(x+1)/2;
  resourceToCapacity = (x: number) => x;
  maxResource = 4;
  reconfigurationDelay = 0;
  reconfigurationCost = 0;

  // records configuration
	numResource: number = 0;
	packetID: PacketID;

  // records reconfiguration status
  timeRemainReconfiguration = 0;



  /**
   * Constructs a link in the neural network initialized with random weight.
   *
   * @param source The source node.
   * @param destination The destination node.
   */
  constructor(source: Node, destination: Node) {
    this.id = source.id + "-" + destination.id;
    this.source = source;
    this.destination = destination;
  }

  allocate(numResource:number, packetID:PacketID) {
    if (numResource != this.numResource) {
      this.numResource = numResource;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
    if (!PacketID.isEqual(packetID, this.packetID)) {
      this.packetID = packetID;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
  }

  transmit() {
    if (this.timeRemainReconfiguration > 0) return;
    if (this.packetID != null) {
      let numTransmission = Math.min(this.source.queues[this.packetID.name],
                                    this.resourceToCapacity(this.numResource));
      // Todo: only packets that are in the queue at the beginning of the slot
      this.source.queues[this.packetID.name] -= numTransmission;
      if (this.packetID.nextPID != null
          || this.packetID.destination != this.destination.id) {
        this.destination.queues[this.packetID.name] += numTransmission;
      }
    }
  }
}


/**
 * Builds a network.
 */

export function buildNetwork(nodeLocations:Coordinate[],
    nodeConnections:Connection[], flows: Flow[], policy:string, V: number): Node[] {
  let network: Node[] = [];

  // Add nodes with node id and coordinate
  for (let n = 0; n < nodeLocations.length; n++) {
    let nodeId = n;
    let node = new Node(nodeId, nodeLocations[n], policy, V);
    network.push(node);
  }

  // Add links based on connection list
  for (let l = 0; l < nodeConnections.length; l++) {
    let src = network[nodeConnections[l].source];
    let dst = network[nodeConnections[l].destination];
    let link = new Link(src, dst);

    src.outputLinks.push(link);
    dst.inputLinks.push(link);

    // Make bidirectional link
    let link2 = new Link(dst, src);
    dst.outputLinks.push(link2);
    src.inputLinks.push(link2);
  }

  // Register flows and generate packet IDs
  PacketID.reset(flows);

  // Initialize queues
  for (let n = 0; n < network.length; n++) {
    network[n].initQueues();
  }

  // Assign arrival generators
  for (let f = 0; f < flows.length; f++) {
    let pidName = flows[f].destination.toString()
                .concat("_", flows[f].service.toString(), "_0");
    let src = flows[f].source;
    network[src].arrivalGenerators.push({'pidName': pidName, 'rate': flows[f].rate});
  }

  return network;
}

export function arrival(network:Node[]) {
  for (let n = 0; n < network.length; n++) {
    for (let a = 0; a < network[n].arrivalGenerators.length; a++) {
      let gen = network[n].arrivalGenerators[a];
      let numPackets = poissonRandom(gen.rate);
      network[n].queues[gen.pidName] += numPackets;
    }
  }
}


function normalRandom(mean = 0, variance = 1): number {
  let v1: number, v2: number, s: number;
  do {
    v1 = 2 * Math.random() - 1;
    v2 = 2 * Math.random() - 1;
    s = v1 * v1 + v2 * v2;
  } while (s > 1);

  let result = Math.sqrt(-2 * Math.log(s) / s) * v1;
  return mean + Math.sqrt(variance) * result;
}

function poissonRandom(mean = 1) :number {
  let L = Math.exp(-mean);
  let p = 1.0;
  let k = 0;

  do {
      k++;
      p *= Math.random();
  } while (p > L);

  return k - 1;
}
