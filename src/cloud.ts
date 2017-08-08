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
}

export class Node {
  id: string;
  /** List of input links. */
  inputLinks: Link[] = [];
  /** List of output links. */
  outputLinks: Link[] = [];
  /** Coordinates  */
  x: number;
  y: number;

  // control policy
  policy = 'ADCNC';
  V = 1.0;
  g = (x: number) => 0.9 * Math.pow(x, 0.9);

  // parameters
  processCost = 1;
  resourceToCost = (x: number) => x;
  resourceToCapacity = (x: number) => x;
  maxResource = 4;
  reconfigurationDelay = 0;
  reconfigurationCost = 0;

  // packet queues
  queues: {[name: string]: number};

  // records configuration
	numResource = 0;
	packetID:PacketID = null;

  // records reconfiguration status
  timeRemainReconfiguration = 0;

  /**
   * Creates a new node with the provided id
   */
  constructor(id: string, coor: Coordinate) {
    this.id = id;
    this.x = coor.x;
    this.y = coor.y;
  }
  initQueues() {
    for (let i = 0; i < PacketID.packetIDs.length; i++) {
      this.queues[PacketID.packetIDs[i].name] = 0;
    }
  }

  allocate(numResource:number, packetID:PacketID) {
    if (numResource != this.numResource) {
      this.numResource = numResource;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
    if (packetID.name != this.packetID.name) {
      this.packetID = packetID;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
  }
  process() {
    if (this.timeRemainReconfiguration > 0) return;
    let numProcess = Math.min(this.queues[this.packetID.name],
                              this.resourceToCapacity(this.numResource));
    // Todo: only packets that are in the queue at the beginning of the slot
    this.queues[this.packetID.name] -= numProcess;
    this.queues[this.packetID.nextPID.name] += numProcess;
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
  name: string;
  nextPID: PacketID;

  constructor(dest: number, service: number, stage: number) {
    this.destination = dest;
    this.service = service;
    this.stage = stage;
    this.name = dest.toString()
                .concat("_", service.toString(), "_", stage.toString());
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
  public static reset(flows: Flow[]) {
    PacketID.packetIDs = [];
    for (let f in flows) {
      for (let s = 0; s <= flows[f].numStage; s++) {
        PacketID.packetIDs.push(new PacketID(flows[f].destination, flows[f].service, s));
      }

    }
  }
}



export class Link {
  id: string;
  source: Node;
  destination: Node;


  // parameters
  transmissionCost = 1;
  resourceToCost = (x: number) => x;
  resourceToCapacity = (x: number) => x;
  maxResource = 4;
  reconfigurationDelay = 0;
  reconfigurationCost = 0;

  // records configuration
	numResource: number;
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
    if (packetID.name != this.packetID.name) {
      this.packetID = packetID;
      this.timeRemainReconfiguration = this.reconfigurationDelay;
    }
  }

  transmit() {
    if (this.timeRemainReconfiguration > 0) return;
    let numTransmission = Math.min(this.source.queues[this.packetID.name],
                              this.resourceToCapacity(this.numResource));
    // Todo: only packets that are in the queue at the beginning of the slot
    this.source.queues[this.packetID.name] -= numTransmission;
    this.destination.queues[this.packetID.name] += numTransmission;
  }
}


/**
 * Builds a network.
 */

export function buildNetwork(nodeLocations:Coordinate[],
    nodeConnections:Connection[]): Node[] {
  let network: Node[] = [];

  // Add nodes with node id and coordinate
  for (let id = 0; id < nodeLocations.length; id++) {
    let nodeId = id.toString();
    let node = new Node(nodeId, nodeLocations[id]);
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

  return network;
}
