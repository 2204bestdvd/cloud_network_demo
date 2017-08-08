import * as d3 from "d3";

export interface Coordinate {
  x: number;
  y: number;
};

export interface Connection {
  source: number;
  destination: number;
};

export class Node {
  id: string;
  /** List of input links. */
  inputLinks: Link[] = [];
  /** List of output links. */
  outputs: Link[] = [];
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
	numResource: number;
	packetID: PacketID;

  // records reconfiguration status
  timeRemainReconfiguration = 0;

  /**
   * Creates a new node with the provided id
   */
  constructor(id: string, coor: Coordinate) {
    this.id = id;
    this.x = coor.x;
    this.y = coor.y;

    //for (let i = 0; i < packetIDs.length; i++) {
    //  this.queues[packetIDs[i].name] = 0;
    //}
  }

  scheduleAndExecute() {
    this.scheduleProcess();
    this.scheduleTransmission();
    this.process();
    this.transmission();
  }
  scheduleProcess() {
    let opt = this.maxWeight('process');

    switch(this.policy) {
      case 'DCNC':
        break;
      case 'ADCNC':
        break;
      default:
        throw Error("Unknown policy");
    }

  }
  scheduleTransmission() {

  }
  process() {

  }
  transmission() {

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
}



export class Link {
  id: string;
  source: Node;
  destination: Node;

  maxResource: number;

  /**
   * Constructs a link in the neural network initialized with random weight.
   *
   * @param source The source node.
   * @param dest The destination node.
   */
  constructor(source: Node, destination: Node) {
    this.id = source.id + "-" + destination.id;
    this.source = source;
    this.destination = destination;
  }
}


/**
 * Builds a network.
 *
 * @param networkShape The shape of the network. E.g. [1, 2, 3, 1] means
 *   the network will have one input node, 2 nodes in first hidden layer,
 *   3 nodes in second hidden layer and 1 output node.
 * @param inputIds List of ids for the input nodes.
 */

/*
export function buildNetwork(
    networkShape: number[],
    inputIds: string[], initZero?: boolean): Node[][] {
  let numLayers = networkShape.length;
  let id = 1;
  // List of layers, with each layer being a list of nodes.
  let network: Node[][] = [];
  for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
    let isOutputLayer = layerIdx === numLayers - 1;
    let isInputLayer = layerIdx === 0;
    let currentLayer: Node[] = [];
    network.push(currentLayer);
    let numNodes = networkShape[layerIdx];
    for (let i = 0; i < numNodes; i++) {
      let nodeId = id.toString();
      if (isInputLayer) {
        nodeId = inputIds[i];
      } else {
        id++;
      }
      let node = new Node(nodeId, {"x": 0, "y": 0});
      currentLayer.push(node);
      if (layerIdx >= 1) {
        // Add links from nodes in the previous layer to this node.
        for (let j = 0; j < network[layerIdx - 1].length; j++) {
          let prevNode = network[layerIdx - 1][j];
          let link = new Link(prevNode, node);
          prevNode.outputs.push(link);
          node.inputLinks.push(link);
        }
      }
    }
  }
  return network;
}
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

    src.outputs.push(link);
    dst.inputLinks.push(link);

    // Make bidirectional link
    let link2 = new Link(dst, src);
    dst.outputs.push(link2);
    src.inputLinks.push(link2);
  }

  return network;
}

export function schedule(network: Node[]) {
  for (let n = 0; n < network.length; n++) {
  }
}
