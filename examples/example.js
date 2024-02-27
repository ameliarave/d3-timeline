import { View } from '../src/View';
import * as d3 from 'd3';

document.addEventListener("DOMContentLoaded", function() {
	const height = 605.12;
  const width = 1161;
  const container = d3.select("#container");
  const svg = container.append("svg")
    .attr("viewBox", [0, 0, width, height]) // width and height hardcoded her
    .attr("width", width)
    .attr("height", height)

  const start = new Date(2023, 5, 12, 10, 15); // year, month (0-indexed), day, hour (00:00-23:59), minute
  const end = new Date(2023, 6, 14, 16, 30);
  const view = new View(start, end, svg);
});
