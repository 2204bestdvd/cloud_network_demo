import * as cloud from "./cloud";
import {
  State,
  getKeyFromValue
} from "./state";
import * as d3 from "d3";

let mainWidth: number;

const RECT_SIZE = 50;

/*
enum HoverType {
  BIAS, WEIGHT
}

interface InputFeature {
  f: (x: number, y: number) => number;
  label?: string;
}

let INPUTS: {[name: string]: InputFeature} = {
  "x": {f: (x, y) => x, label: "X_1"},
  "y": {f: (x, y) => y, label: "X_2"},
  "xSquared": {f: (x, y) => x * x, label: "X_1^2"},
  "ySquared": {f: (x, y) => y * y,  label: "X_2^2"},
  "xTimesY": {f: (x, y) => x * y, label: "X_1X_2"},
  "sinX": {f: (x, y) => Math.sin(x), label: "sin(X_1)"},
  "sinY": {f: (x, y) => Math.sin(y), label: "sin(X_2)"},
};
*/


let nodeCoordinates = [{"x": 40, "y": 50}, {"x": 150, "y": 200},
  {"x": 250, "y": 30}, {"x": 350, "y": 120}, {"x": 450, "y": 50}];
let nodeConnections = [{"source": 0, "destination": 1},
  {"source": 0, "destination": 2}, {"source": 2, "destination": 3},
  {"source": 1, "destination": 3}, {"source": 2, "destination": 4}];
let flows = [{"source": 0, "destination": 3, "service": 0, "numStage": 2, "rate": 3}];//,
//  {"source": 1, "destination": 2, "service": 1, "numStage": 2, "rate": 2}];
let policy = "DCNC";
let V = 5;

//let packetIDs: cloud.PacketID[];
//let packetID1 = new cloud.PacketID(0,0,0);
//let packetIDs = [packetID1];


let linkWidthScale = d3.scaleLinear()
  .domain([0, 4])
  .range([0, 6])
  .clamp(true);

let colorScale = d3.scaleLinear<string, string>()
    .domain([0, .5, 1])
    .range(["#f1c405", "#f4b342", "#e52020"])
    .clamp(true);


class Player {
  private timerIndex = 0;
  private isPlaying = false;
  private callback: (isPlaying: boolean) => void = null;

  /** Plays/pauses the player. */
  playOrPause() {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.pause();
    } else {
      this.isPlaying = true;
      if (iter === 0) {
        simulationStarted();
      }
      this.play();
    }
  }

  onPlayPause(callback: (isPlaying: boolean) => void) {
    this.callback = callback;
  }

  play() {
    this.pause();
    this.isPlaying = true;
    if (this.callback) {
      this.callback(this.isPlaying);
    }
    this.start(this.timerIndex);
  }

  pause() {
    this.timerIndex++;
    this.isPlaying = false;
    if (this.callback) {
      this.callback(this.isPlaying);
    }
  }

  private start(localTimerIndex: number) {
    d3.timer(() => {
      if (localTimerIndex < this.timerIndex) {
        return true;  // Done.
      }
      oneStep();
      return false;  // Not done.
    }, 0);
  }
}

let state = State.deserializeState();


let iter = 0;
//let network: cloud.Node[][] = null;
let network: cloud.Node[] = null;

let player = new Player();


function makeGUI() {
  d3.select("#reset-button").on("click", () => {
    reset();
    userHasInteracted();
    d3.select("#play-pause-button");
  });

  d3.select("#play-pause-button").on("click", function () {
    // Change the button's content.
    userHasInteracted();
    player.playOrPause();
  });

  player.onPlayPause(isPlaying => {
    d3.select("#play-pause-button").classed("playing", isPlaying);
  });

  d3.select("#next-step-button").on("click", () => {
    player.pause();
    userHasInteracted();
    if (iter === 0) {
      simulationStarted();
    }
    oneStep();
  });


  let policyDropdown = d3.select("#policies").on("change", function() {
    policy = d3.select("#policies").property("value");
    //policy = this.value;
    parametersChanged = true;
    reset();
    console.log(policy);
  });
  policyDropdown.property("value", policy);

  let VDropdown = d3.select("#parameterV").on("change", function() {
    V = +d3.select("#parameterV").property("value");
    parametersChanged = true;
    reset();
    console.log(V);
  });
  VDropdown.property("value", V);


  // Add scale to the gradient color map.
  let x = d3.scaleLinear().domain([0, 4]).range([0, 144]);
  //let xAxis = d3.svg.axis()
  //  .scale(x)
  //  .orient("bottom")
  let xAxis = d3.axisBottom(x)
    .tickValues([0, 1, 2, 3, 4])
    .tickFormat(d3.format("d"));
  d3.select("#colormap g.core").append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0,10)")
    .call(xAxis);


  // Listen for css-responsive changes and redraw the svg network.
  window.addEventListener("resize", () => {
    let newWidth = document.querySelector("#main-part")
        .getBoundingClientRect().width;
    if (newWidth !== mainWidth) {
      mainWidth = newWidth;
      drawNetwork(network);
      updateUI(true);
    }
  });

  /*
  // Hide the text below the visualization depending on the URL.
  if (state.hideText) {
    d3.select("#article-text").style("display", "none");
    d3.select("div.more").style("display", "none");
    d3.select("header").style("display", "none");
  }
  */
}


function drawNode(cx: number, cy: number, nodeId: number, isInput: boolean,
    container: d3.Selection<any,any,any,any>, node: cloud.Node) {
  let x = cx - RECT_SIZE / 2;
  let y = cy - RECT_SIZE / 2;

  let nodeGroup = container.append("g")
    .attr("class", "node")
    .attr("id", `node${nodeId}`)
    .attr("transform", `translate(${x},${y})`);

  // Draw the main rectangle.
  nodeGroup.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", RECT_SIZE)
    .attr("height", RECT_SIZE)

/*
  nodeGroup.append('rect')
    .attr("id", `resource-${nodeId}`)
    .attr('x', -10).attr('y', 30)
    .attr('width', 10).attr('height', 10)
    .attr('fill', 'red');
*/


  // Draw the node's canvas.
  let div = d3.select("#network").insert("div", ":first-child")
    .attr("id", `canvas-${nodeId}`)
    .attr("class", "canvas")
    .style("position", "absolute")
    .style("left", `${x + 3}px`)
    .style("top", `${y - 17}px`);


  let svg = div.append('svg');
  let dataset = d3.entries(node.queues);
  let numQueues = dataset.length;
  svg.selectAll('rect')
    .data(dataset).enter()
    //.data(numbers).enter()
    .append('rect')
    .attr('x', 1).attr('y', function (d,i) { return i * 3; })
    .attr('width',function (d) { return d.value }   ).attr('height', 2 )
    //.attr('width',function (d) { return d/10 }   ).attr('height', 2 )
    //.attr('fill', 'royalblue');
    .attr('fill', function(d,i) {return d3.interpolatePlasma(i/numQueues);});


  // Draw node resource
  if (node.timeRemainReconfiguration > 0) {
    svg.append('rect')
      .attr('x', 0).attr('y', 20)
      .attr('width', RECT_SIZE).attr('height', RECT_SIZE)
      .attr('fill', 'gray');
  } else {
    let resourceHeight = RECT_SIZE * node.numResource / 4;
    svg.append('rect')
      .attr('x', 0).attr('y', 20 + RECT_SIZE - resourceHeight)
      .attr('width', RECT_SIZE).attr('height', resourceHeight)
      .attr('fill', colorScale(node.numResource/4));
  }
  // Draw commodity being processed
  let servedQueue = -1;
  if (node.packetID) {
    for (let i = 0; i < dataset.length; i++) {
      if (dataset[i].key == node.packetID.name) {
        servedQueue = i;
      }
    }
  }
  if (servedQueue >= 0) {
    svg.append('rect')
      .attr('x', 0).attr('y', 20 + RECT_SIZE + 10)
      .attr('width', 10).attr('height', 10)
      .attr('fill', d3.interpolatePlasma(servedQueue/numQueues));
  }

    /*
    .on("mouseenter", function() {
      selectedNodeId = nodeId;
      div.classed("hovered", true);
      nodeGroup.classed("hovered", true);
      updateDecisionBoundary(network, false);
      heatMap.updateBackground(boundary[nodeId], state.discretize);
    })
    .on("mouseleave", function() {
      selectedNodeId = null;
      div.classed("hovered", false);
      nodeGroup.classed("hovered", false);
      updateDecisionBoundary(network, false);
      heatMap.updateBackground(boundary[nn.getOutputNode(network).id],
          state.discretize);
    });
  if (isInput) {
    div.on("click", function() {
      state[nodeId] = !state[nodeId];
      parametersChanged = true;
      reset();
    });
    div.style("cursor", "pointer");
  }
  if (isInput) {
    div.classed(activeOrNotClass, true);
  }
  let nodeHeatMap = new HeatMap(RECT_SIZE, DENSITY / 10, xDomain,
      xDomain, div, {noSvg: true});
  div.datum({heatmap: nodeHeatMap, id: nodeId});
  */

}


function drawNetwork(network: cloud.Node[]): void {
  let svg = d3.select("#svg");
  // Remove all svg elements.
  svg.select("g.core").remove();
  // Remove all div elements.
  d3.select("#network").selectAll("div.canvas").remove();
  d3.select("#network").selectAll("div.plus-minus-neurons").remove();

  // Get the width of the svg container.
  let padding = 3;
  let co = d3.select(".column.output").node() as HTMLDivElement;
  let cf = d3.select(".column.topology").node() as HTMLDivElement;
  let width = co.offsetLeft - cf.offsetLeft;
  svg.attr("width", width);

  let container = svg.append("g")
    .classed("core", true)
    .attr("transform", `translate(${padding},${padding})`);

  let numNodes = network.length;

  // Draw nodes
  for (let i = 0; i < numNodes; i++) {
    let node = network[i];
    let cx = node.x;
    let cy = node.y;
    //let cy = nodeIndexScale(i) + RECT_SIZE / 2;
    //node2coord[node.id] = {cx, cy};
    drawNode(cx, cy, node.id, false, container, node);
  }

  // Draw links.
  for (let i = 0; i < network.length; i++) {
    let node = network[i];
    for (let j = 0; j < node.inputLinks.length; j++) {
      let link = node.inputLinks[j];
      let path: SVGPathElement = drawLink(link,
          container, j === 0, j, node.inputLinks.length).node() as any;
    }
  }


}


function drawLink(
    link: cloud.Link,
    container: d3.Selection<any,any,any,any>,
    isFirst: boolean, index: number, length: number) {
  let line = container.insert("path", ":first-child");
  let lineResource = container.insert("path", ":first-child");
  let transmitted = container.insert("rect", ":first-child");
  //let source = node2coord[input.source.id];
  //let dest = node2coord[input.dest.id];
  let src = link.source;
  let dst = link.destination;
  let datum = {
    source: {
      y: src.x + RECT_SIZE / 2 * (dst.x - src.x) / Math.abs(dst.x - src.x),
      x: src.y - 12 * (dst.x - src.x) / Math.abs(dst.x - src.x)
    },
    target: {
      y: dst.x - RECT_SIZE / 2 * (dst.x - src.x) / Math.abs(dst.x - src.x),
      x: dst.y - 12 * (dst.x - src.x) / Math.abs(dst.x - src.x)
    }
  };
  //let diagonal = d3.svg.diagonal().projection(d => [d.y, d.x]);

  let diagonal = function link(d:any) {
    return "M" + d.source.y + "," + d.source.x
        + "C" + (d.source.y + d.target.y) / 2 + "," + d.source.x
        + " " + (d.source.y + d.target.y) / 2 + "," + d.target.x
        + " " + d.target.y + "," + d.target.x;
  }

  line.attr("marker-start", "url(#markerArrow)")
    .attr("class", "link")
    .attr("id", "link" + link.source.id + "-" + link.destination.id)
    .attr("d", diagonal(datum))

  lineResource.attr("marker-start", "url(#markerArrow)")
    .attr("class", "link")
    .attr("id", "link" + link.source.id + "-" + link.destination.id + "-resource")
    .attr("d", diagonal(datum))
    .style("stroke-dashoffset", -iter / 3)
    .style("stroke-width", linkWidthScale(Math.abs(link.numResource)))
    .style("stroke", colorScale(link.numResource / 4));


  let dataset = d3.entries(link.source.queues);
  let numQueues = dataset.length;

  // Draw commodity being processed
  let servedQueue = -1;
  if (link.packetID) {
    for (let i = 0; i < dataset.length; i++) {
      if (dataset[i].key == link.packetID.name) {
        servedQueue = i;
      }
    }
  }
  if (servedQueue >= 0) {
    transmitted.attr('x', datum.source.y + ((datum.target.y > datum.source.y)?3:-13))
      .attr('y', datum.source.x + 3)
      .attr('width', 10).attr('height', 10)
      .attr('fill', d3.interpolatePlasma(servedQueue/numQueues));
  }

    // Add an invisible thick link that will be used for
    // showing the weight value on hover.
    /*
    container.append("path")
      //.attr("d", diagonal(datum, 0))
      .attr("d", d3.linkHorizontal()
            .x(function(d) {return d[0];})
            .y(function(d) {return d[1];}))
      .attr("class", "link-hover");
      //.on("mouseenter", function() {
      //  updateHoverCard(HoverType.WEIGHT, input, d3.mouse(this));
      //}).on("mouseleave", function() {
      //  updateHoverCard(null);
      //});
    */

  return line;
}


function updateLinkUI(network: cloud.Node[], container: d3.Selection<any,any,any,any>) {
  for (let n = 0; n < network.length; n++) {
    let node = network[n];
    for (let l = 0; l < node.inputLinks.length; l++) {
      let link = node.inputLinks[l];
      container.select(`#link${link.source.id}-${link.destination.id}`)
          .style("stroke-dashoffset", -iter / 3)
          .style("stroke-width", linkWidthScale(Math.abs(link.numResource)))
          .style("stroke", colorScale(link.numResource))
          .datum(link);
    }
  }
}


function updateUI(firstStep = false) {
  /*
  // Update the links visually.
  updateWeightsUI(network, d3.select("g.core"));
  // Update the bias values visually.
  updateBiasesUI(network);
  // Get the decision boundary of the network.
  updateDecisionBoundary(network, firstStep);
  let selectedId = selectedNodeId != null ?
      selectedNodeId : nn.getOutputNode(network).id;
  heatMap.updateBackground(boundary[selectedId], state.discretize);


  // Update all decision boundaries.
  d3.select("#network").selectAll("div.canvas")
      .each(function(data: {heatmap: HeatMap, id: string}) {
    data.heatmap.updateBackground(reduceMatrix(boundary[data.id], 10),
        state.discretize);
  });
  */

  function zeroPad(n: number): string {
    let pad = "000000";
    return (pad + n).slice(-pad.length);
  }

  function addCommas(s: string): string {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function humanReadable(n: number): string {
    return n.toFixed(3);
  }

  /*
  // Update loss and iteration number.
  d3.select("#loss-train").text(humanReadable(lossTrain));
  d3.select("#loss-test").text(humanReadable(lossTest));
  */
  d3.select("#iter-number").text(addCommas(zeroPad(iter)));
  //lineChart.addDataPoint([lossTrain, lossTest]);

  drawNetwork(network);
}




function oneStep(): void {
  iter++;
  updateUI();
  for (let n = 0; n < network.length; n++) {
    network[n].timeRemainReconfiguration = Math.max(0, network[n].timeRemainReconfiguration - 1);
    for (let l in network[n].outputLinks) {
      network[n].outputLinks[l].timeRemainReconfiguration =
        Math.max(0, network[n].outputLinks[l].timeRemainReconfiguration - 1);
    }
  }

  for (let n = 0; n < network.length; n++) {
    network[n].schedule();
  }
  for (let n = 0; n < network.length; n++) {
    network[n].processAndTransmit();
    //console.log(network[n].id, network[n].numResource, network[n].queues);
  }
  cloud.arrival(network);

  for (let n = 0; n < 20000000; n++) {}

  /*
  trainData.forEach((point, i) => {
    let input = constructInput(point.x, point.y);
    nn.forwardProp(network, input);
    nn.backProp(network, point.label, nn.Errors.SQUARE);
    if ((i + 1) % state.batchSize === 0) {
      nn.updateWeights(network, state.learningRate, state.regularizationRate);
    }
  });
  // Compute the loss.
  lossTrain = getLoss(network, trainData);
  lossTest = getLoss(network, testData);
  */
  //updateUI();

}


function reset(onStartup=false) {
  /*
  lineChart.reset();
  state.serialize();
  */
  if (!onStartup) {
    userHasInteracted();
  }
  player.pause();

  /*
  let suffix = state.numHiddenLayers !== 1 ? "s" : "";
  d3.select("#layers-label").text("Hidden layer" + suffix);
  d3.select("#num-layers").text(state.numHiddenLayers);
  */

  // Make a simple network.
  iter = 0;

  //let numInputs = constructInput(0 , 0).length;
  //let shape = [numInputs].concat(state.networkShape).concat([1]);
  //let outputActivation = (state.problem === Problem.REGRESSION) ?
  //    nn.Activations.LINEAR : nn.Activations.TANH;
  //network = cloud.buildNetwork(shape, constructInputIds(), state.initZero);
  //lossTrain = getLoss(network, trainData);
  //lossTest = getLoss(network, testData);
  network = cloud.buildNetwork(nodeCoordinates, nodeConnections, flows, policy, V);
  drawNetwork(network);

  // Reset the list of packetIDs and initialize queues in nodes



  updateUI(true);
};




let firstInteraction = true;
let parametersChanged = false;

function userHasInteracted() {
  if (!firstInteraction) {
    return;
  }
  firstInteraction = false;
  let page = 'index';
  /*
  if (state.tutorial != null && state.tutorial !== '') {
    page = `/v/tutorials/${state.tutorial}`;
  }
  */
  /*
  ga('set', 'page', page);
  ga('send', 'pageview', {'sessionControl': 'start'});
  */
}


function simulationStarted() {
  /*
  ga('send', {
    hitType: 'event',
    eventCategory: 'Starting Simulation',
    eventAction: parametersChanged ? 'changed' : 'unchanged',
    eventLabel: state.tutorial == null ? '' : state.tutorial
  });
  */
  parametersChanged = false;
}

makeGUI();
reset(true);
