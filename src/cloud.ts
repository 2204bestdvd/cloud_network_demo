
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
  policy: string;
  V: number;

  // parameters
  reconfigurationDelay: number;
  reconfigurationCost: number;

  // records configuration
	numResource: number;
	resourceCost: number;
	capacity: number;
	packetID: PacketID;

  // records reconfiguration status
  timeRemainReconfiguration: number;

  /**
   * Creates a new node with the provided id
   */
  constructor(id: string, coor: Coordinate) {
    this.id = id;
    this.x = coor.x;
    this.y = coor.y;
  }

}

export interface PacketID {
  destination: number;
  service: number;
  stage: number;
}



export class Link {
  id: string;
  source: Node;
  dest: Node;

  /**
   * Constructs a link in the neural network initialized with random weight.
   *
   * @param source The source node.
   * @param dest The destination node.
   */
  constructor(source: Node, dest: Node) {
    this.id = source.id + "-" + dest.id;
    this.source = source;
    this.dest = dest;
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
