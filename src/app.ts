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


let nodeCoordinates = [{"x": 40, "y": 30}, {"x": 180, "y": 180},
  {"x": 200, "y": 10}, {"x": 280, "y": 100}];
let nodeConnections = [{"source": 0, "destination": 1},
  {"source": 0, "destination": 2}, {"source": 2, "destination": 3}];
let flows = [{"source": 0, "destination": 3, "service": 0, "numStage": 2},
  {"source": 1, "destination": 2, "service": 1, "numStage": 2}];

//let packetIDs: cloud.PacketID[];
//let packetID1 = new cloud.PacketID(0,0,0);
//let packetIDs = [packetID1];


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

  /*
  d3.select("#data-regen-button").on("click", () => {
    generateData();
    parametersChanged = true;
  });

  let dataThumbnails = d3.selectAll("canvas[data-dataset]");
  dataThumbnails.on("click", function() {
    let newDataset = datasets[this.dataset.dataset];
    if (newDataset === state.dataset) {
      return; // No-op.
    }
    state.dataset =  newDataset;
    dataThumbnails.classed("selected", false);
    d3.select(this).classed("selected", true);
    generateData();
    parametersChanged = true;
    reset();
  });

  let datasetKey = getKeyFromValue(datasets, state.dataset);
  // Select the dataset according to the current state.
  d3.select(`canvas[data-dataset=${datasetKey}]`)
    .classed("selected", true);

  let regDataThumbnails = d3.selectAll("canvas[data-regDataset]");
  regDataThumbnails.on("click", function() {
    let newDataset = regDatasets[this.dataset.regdataset];
    if (newDataset === state.regDataset) {
      return; // No-op.
    }
    state.regDataset =  newDataset;
    regDataThumbnails.classed("selected", false);
    d3.select(this).classed("selected", true);
    generateData();
    parametersChanged = true;
    reset();
  });

  */

  /*
  let regDatasetKey = getKeyFromValue(regDatasets, state.regDataset);
  // Select the dataset according to the current state.
  d3.select(`canvas[data-regDataset=${regDatasetKey}]`)
    .classed("selected", true);


  d3.select("#add-layers").on("click", () => {
    if (state.numHiddenLayers >= 6) {
      return;
    }
    state.networkShape[state.numHiddenLayers] = 2;
    state.numHiddenLayers++;
    parametersChanged = true;
    reset();
  });

  d3.select("#remove-layers").on("click", () => {
    if (state.numHiddenLayers <= 0) {
      return;
    }
    state.numHiddenLayers--;
    state.networkShape.splice(state.numHiddenLayers);
    parametersChanged = true;
    reset();
  });

  let showTestData = d3.select("#show-test-data").on("change", function() {
    state.showTestData = this.checked;
    state.serialize();
    userHasInteracted();
    heatMap.updateTestPoints(state.showTestData ? testData : []);
  });
  // Check/uncheck the checkbox according to the current state.
  showTestData.property("checked", state.showTestData);

  let discretize = d3.select("#discretize").on("change", function() {
    state.discretize = this.checked;
    state.serialize();
    userHasInteracted();
    updateUI();
  });
  // Check/uncheck the checbox according to the current state.
  discretize.property("checked", state.discretize);

  let percTrain = d3.select("#percTrainData").on("input", function() {
    state.percTrainData = this.value;
    d3.select("label[for='percTrainData'] .value").text(this.value);
    generateData();
    parametersChanged = true;
    reset();
  });
  percTrain.property("value", state.percTrainData);
  d3.select("label[for='percTrainData'] .value").text(state.percTrainData);

  let noise = d3.select("#noise").on("input", function() {
    state.noise = this.value;
    d3.select("label[for='noise'] .value").text(this.value);
    generateData();
    parametersChanged = true;
    reset();
  });
  noise.property("value", state.noise);
  d3.select("label[for='noise'] .value").text(state.noise);

  let batchSize = d3.select("#batchSize").on("input", function() {
    state.batchSize = this.value;
    d3.select("label[for='batchSize'] .value").text(this.value);
    parametersChanged = true;
    reset();
  });
  batchSize.property("value", state.batchSize);
  d3.select("label[for='batchSize'] .value").text(state.batchSize);

  let activationDropdown = d3.select("#activations").on("change", function() {
    state.activation = activations[this.value];
    parametersChanged = true;
    reset();
  });
  activationDropdown.property("value",
      getKeyFromValue(activations, state.activation));

  let learningRate = d3.select("#learningRate").on("change", function() {
    state.learningRate = +this.value;
    state.serialize();
    userHasInteracted();
    parametersChanged = true;
  });
  learningRate.property("value", state.learningRate);

  let regularDropdown = d3.select("#regularizations").on("change",
      function() {
    state.regularization = regularizations[this.value];
    parametersChanged = true;
    reset();
  });
  regularDropdown.property("value",
      getKeyFromValue(regularizations, state.regularization));

  let regularRate = d3.select("#regularRate").on("change", function() {
    state.regularizationRate = +this.value;
    parametersChanged = true;
    reset();
  });
  regularRate.property("value", state.regularizationRate);

  let problem = d3.select("#problem").on("change", function() {
    state.problem = problems[this.value];
    generateData();
    drawDatasetThumbnails();
    parametersChanged = true;
    reset();
  });
  problem.property("value", getKeyFromValue(problems, state.problem));
  */

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
      //drawNetwork(network);
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


function drawNode(cx: number, cy: number, nodeId: string, isInput: boolean,
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
    .attr("height", RECT_SIZE);

  // Draw the node's canvas.
  let div = d3.select("#network").insert("div", ":first-child")
    .attr("id", `canvas-${nodeId}`)
    .attr("class", "canvas")
    .style("position", "absolute")
    .style("left", `${x + 3}px`)
    .style("top", `${y + 3}px`);

  //let queues = div.selectAll(".queue").data(node.queues)

  /*
  var numbers = [677, 86, 500, 235];
  var colors = ['red', 'blue', 'red', 'blue']
  div.append('svg')
    //.style("position", "absolute")
    //.style("left", `${x - 10}px`)
    //.style("top", `${y - 10}px`)
    .attr('width', 80).attr('height', 80).selectAll('rect')
    .data(numbers).enter()
    .append('rect')
    .attr('x', 1).attr('y', function (d,i) { return i * 3; })
    .attr('width',function (d) { return d/10 }   ).attr('height', 2 )
    //.attr('fill', 'royalblue');
    .attr('fill', function(d,i) {return d3.interpolateRainbow(i/4);})
  */

  div.append('svg')
    .insert('rect', ':first-child')
    .attr('x', 0).attr('y', 10)
    .attr('width', 30).attr('height', 30)
    .attr('fill', '#e52020');


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
      let path: SVGPathElement = drawLink2(link,
          container, j === 0, j, node.inputLinks.length).node() as any;
    }
  }


}

/*
// Draw network
function drawNetwork(network: cloud.Node[][]): void {
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

  // Map of all node coordinates.
  let node2coord: {[id: string]: {cx: number, cy: number}} = {};
  let container = svg.append("g")
    .classed("core", true)
    .attr("transform", `translate(${padding},${padding})`);
  // Draw the network layer by layer.
  let numLayers = network.length;
  let featureWidth = 118;
  let layerScale = d3.scaleOrdinal<number, number>()
      .domain(d3.range(1, numLayers - 1))
      .range([featureWidth, width - RECT_SIZE])
      //.rangePoints([featureWidth, width - RECT_SIZE], 0.7);
  let nodeIndexScale = (nodeIndex: number) => nodeIndex * (RECT_SIZE + 25);


  let calloutThumb = d3.select(".callout.thumbnail").style("display", "none");
  let calloutWeights = d3.select(".callout.weights").style("display", "none");
  let idWithCallout = null;
  let targetIdWithCallout = null;

  // Draw the input layer separately.
  let cx = RECT_SIZE / 2 + 50;
  let nodeIds = Object.keys(INPUTS);
  let maxY = nodeIndexScale(nodeIds.length);
  nodeIds.forEach((nodeId, i) => {
    let cy = nodeIndexScale(i) + RECT_SIZE / 2;
    node2coord[nodeId] = {cx, cy};
    drawNode(cx, cy, nodeId, true, container);
  });



  // Draw the intermediate layers.
  for (let layerIdx = 1; layerIdx < numLayers - 1; layerIdx++) {
    let numNodes = network[layerIdx].length;
    let cx = layerScale(layerIdx) + RECT_SIZE / 2;
    maxY = Math.max(maxY, nodeIndexScale(numNodes));
    //addPlusMinusControl(layerScale(layerIdx), layerIdx);
    for (let i = 0; i < numNodes; i++) {
      let node = network[layerIdx][i];
      let cy = nodeIndexScale(i) + RECT_SIZE / 2;
      node2coord[node.id] = {cx, cy};
      drawNode(cx, cy, node.id, false, container, node);


      // Draw links.

      for (let j = 0; j < node.inputLinks.length; j++) {
        let link = node.inputLinks[j];
        let path: SVGPathElement = drawLink(link, node2coord, network,
            container, j === 0, j, node.inputLinks.length).node() as any;

      }

    }
  }




  // Draw the output node separately.
  cx = width + RECT_SIZE / 2;
  let node = network[numLayers - 1][0];
  let cy = nodeIndexScale(0) + RECT_SIZE / 2;
  node2coord[node.id] = {cx, cy};
  // Draw links.
  for (let i = 0; i < node.inputLinks.length; i++) {
    let link = node.inputLinks[i];
    drawLink(link, node2coord, network, container, i === 0, i,
        node.inputLinks.length);
  }

  // Adjust the height of the svg.
  svg.attr("height", maxY);

  // Adjust the height of the topology column.
  let height = Math.max(
    getRelativeHeight(calloutThumb),
    getRelativeHeight(calloutWeights),
    getRelativeHeight(d3.select("#network"))
  );
  d3.select(".column.topology").style("height", height + "px");
}
*/

function getRelativeHeight(selection: d3.Selection<any,any,any,any>) {
  let node = selection.node() as HTMLAnchorElement;
  return node.offsetHeight + node.offsetTop;
}

function drawLink2(
    input: cloud.Link,
    container: d3.Selection<any,any,any,any>,
    isFirst: boolean, index: number, length: number) {
  let line = container.insert("path", ":first-child");
  //let source = node2coord[input.source.id];
  //let dest = node2coord[input.dest.id];
  let src = input.source;
  let dst = input.destination;
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
    .attr("id", "link" + input.source.id + "-" + input.destination.id)
    .attr("d", diagonal(datum));

  return line;
}

function drawLink(
    input: cloud.Link, node2coord: {[id: string]: {cx: number, cy: number}},
    network: cloud.Node[][], container: d3.Selection<any,any,any,any>,
    isFirst: boolean, index: number, length: number) {
  let line = container.insert("path", ":first-child");
  let source = node2coord[input.source.id];
  let destination = node2coord[input.destination.id];
  let datum = {
    source: {
      y: source.cx + RECT_SIZE / 2,
      x: source.cy
    },
    target: {
      y: destination.cx - RECT_SIZE / 2,
      x: destination.cy + ((index - (length - 1) / 2) / length) * 12
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
    .attr("id", "link" + input.source.id + "-" + input.destination.id)
    .attr("d", diagonal(datum));
    //.attr("d", diagonal(datum, 0));


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

}




function oneStep(): void {
  iter++;
  updateUI();

  for (let n = 0; n < network.length; n++) {
    network[n].schedule();
  }
  for (let n = 0; n < network.length; n++) {
    network[n].processAndTransmit();
  }
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
  network = cloud.buildNetwork(nodeCoordinates, nodeConnections);
  //lossTrain = getLoss(network, trainData);
  //lossTest = getLoss(network, testData);
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
