'use strict'


// http://www.pyktech.com/blog/150/
// https://gist.github.com/Fil/fe6c5681a6102ec483c7
// https://github.com/mbostock/d3/pull/2225#issuecomment-73426201


//require modules
let fs = require("fs")
let path = require("path")

let d3 = require("d3")
let jsdom = require("jsdom")

const document = jsdom.jsdom()


let rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../output/out.json')))


let data = Object.keys(rawData.metro_level).map( metro => ({
    x: rawData.metro_level[metro].population,
    y: rawData.metro_level[metro].variance
})).filter(d => ((d.x < 1000000) && (d.y < 400)))


let margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom


// setup x 
let xValue = function(d) { return d.x}, // data -> value
    xScale = d3.scale.linear().range([0, width]), // value -> display
    xMap = function(d) { return xScale(xValue(d))}, // data -> display
    xAxis = d3.svg.axis().scale(xScale).orient("bottom")

// setup y
let yValue = function(d) { return d.y}, // data -> value
    yScale = d3.scale.linear().range([height, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d))}, // data -> display
    yAxis = d3.svg.axis().scale(yScale).orient("left")

// setup fill color
let cValue = function(d) { return d.Manufacturer},
    color = d3.scale.category10()


// add the graph canvas to the body of the webpage
let svg = d3.select(document.body).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


// don't want dots overlapping axis, so add in buffer to data domain
xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1])
yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1])

// x-axis
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("class", "label")
    .attr("x", width)
    .attr("y", -6)
    .style("text-anchor", "end")
    .text("population")

// y-axis
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("empShare quotient variance")

// draw dots
svg.selectAll(".dot")
    .data(data)
    .enter().append("circle")
    .attr("class", "dot")
    .attr("r", 3.5)
    .attr("cx", xMap)
    .attr("cy", yMap)


console.log(d3.select(document.body).html())

