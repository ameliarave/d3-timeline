class View {
  constructor(startDate, endDate, svgElement) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.svg = svgElement;

    // Initialize your x and y scales, axis, etc.
    this.x = d3.scaleTime(); // Just an example, use your own scale here
    this.y = d3.scaleLinear();
		this.width = 960;
    this.height = 500;
    this.existingLine = null; // Accessible by all code after this definition
    this.existingDiv = null; 
    this.isCompareChecked = false;
    this.firstX = null;
    this.secondX = null;
    this.firstXDate = null;    
    this.secondXDate = null; 
    this.blanket = null;
    this.isSecondEdgePinned = false;
    this.isTooltipDisplayed = false;
    this.tooltipTimeout = null;  // Accessible by all code after this definition
    this.currentTooltip = null;
    this.lastTransform = d3.zoomIdentity;
    this.toolX = null;
    this.toolY = null;
    
    // binding
    this.zoomed = this.zoomed.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleDblClick = this.handleDblClick.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
    this.updateBlanket = this.updateBlanket.bind(this);
    this.resetZoom = this.resetZoom.bind(this);
    this.resetBlanket = this.resetBlanket.bind(this);
    this.checkClick = this.checkClick.bind(this);
    this.createCheckbox = this.createCheckbox.bind(this);
    this.createLine = this.createLine.bind(this);

    this.init();
    this.bindEvents();
  }

  init() {
    // Code to set up your SVG, scales, and axes goes here.
    this.x = d3.scaleTime()
      .domain([this.startDate, this.endDate]) // new Date() objects
      .range([0, this.width ]);

    this.y = d3.scaleLinear()
      .domain([0, 600])
      .range([-1, this.height + 1]);

    this.xAxis = d3.axisBottom(this.x)
      .tickSize(this.height)    
      .tickPadding(8 - this.height)
      .ticks(8);

    this.yAxis = d3.axisRight(this.y)
      .ticks(10)
      .tickSize(this.width)
      .tickPadding(8 - this.width);

    this.container = d3.select("#container");   
    
    // Define gradient
    this.defs = this.svg.append("defs");
    this.gradient = this.defs.append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");

    this.colorStops = [
    { offset: "0.0%", color: "#2c7bb6" },
    { offset: "12.5%", color: "#00a6ca" },
    { offset: "25.0%", color: "#00ccbc" },
    { offset: "37.5%", color: "#90eb9d" },
    { offset: "50.0%", color: "#ffff8c" },
    { offset: "62.5%", color: "#f9d057" },
    { offset: "75.0%", color: "#f29e2e" },
    { offset: "87.5%", color: "#e76818" },
    { offset: "100.0%", color: "#d7191c" }
  	];

    // Add color stops to gradient (can define these stops in the array)
    this.gradient.selectAll("stop")
      .data(this.colorStops)
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    this.view = this.svg.append("rect")
      .attr("class", "view")
      .attr("x", 0.5)
      .attr("y", 0.5)
      .attr("width", this.width - 1)
      .attr("height", this.height - 1)
      .attr("fill", "url(#gradient)");

    this.gX = this.svg.append("g")
      .attr("class", "axis axis--x")   	
      .call(this.xAxis);

    this.gY = this.svg.append("g")
      .attr("class", "axis axis--y")
      .call(this.yAxis);    

    this.zoom = d3.zoom()
      .scaleExtent([1, 100])
      .translateExtent([[-25, -25], [this.width, this.height]])
      .on("zoom", this.zoomed.bind(this));  
  }
  
  bindEvents() {
  	this.svg.call(this.zoom);
    this.svg.on("dblclick.zoom", null);
    
    this.svg.on("click", (event) => {    
      this.handleClick(event);
    });   
  
    this.svg.on("dblclick", (event) => {
      this.handleDblClick(event);
    });
  
    this.svg.on("mousemove", (event) => {
      this.updateBlanket(event);
    });

    document.getElementById('resetButton').addEventListener('click', () => {
      this.resetZoom();
      this.resetBlanket();
    });
  }

  zoomed(event) {
    const { transform } = event;
    let minX = null;
    this.lastTransform = transform;  // Update the last transform
    this.view.attr("transform", transform);
  	this.gX.call(this.xAxis.scale(transform.rescaleX(this.x)));
  	this.gY.call(this.yAxis.scale(transform.rescaleY(this.y)));    
    
    // Update positions of both edges (if they exist)
    if (this.firstXDate && !this.secondXDate) {
      this.firstX = this.lastTransform.rescaleX(this.x)(this.firstXDate);
      this.blanket.attr("x", this.firstX);
    } else if (this.firstXDate && this.secondXDate){
    	this.firstX = this.lastTransform.rescaleX(this.x)(this.firstXDate);
      this.secondX = this.lastTransform.rescaleX(this.x)(this.secondXDate);
      this.blanket.attr("x", Math.min(this.firstX, this.secondX));
      this.blanket.attr("width", Math.abs(this.secondX - this.firstX));
    }        
    // Update the position of the vertical line based on the latest zoom/pan transformation
    if (this.existingLine) {
      const lineDateOrig = this.existingLine.datum().lineDate;
      const newX = this.lastTransform.rescaleX(this.x)(lineDateOrig);
      this.existingLine
        .attr('x1', this.lastTransform.rescaleX(this.x)(lineDateOrig))
        .attr('x2', this.lastTransform.rescaleX(this.x)(lineDateOrig));
                
      if(this.existingDiv){
        // Calculating the position for the div based on SVG line
        const svgRect = this.svg.node().getBoundingClientRect();
        const lineRect = this.existingLine.node().getBoundingClientRect();
        const newDivX = lineRect.left - svgRect.left;
        const newDivY = lineRect.top - svgRect.top;

        this.existingDiv.style.left = `${newDivX + 15}px`;
        this.existingDiv.style.top = `${event.pageY - (this.existingDiv.offsetHeight / 2)}px`;
      }    
      if (this.isTooltipDisplayed) {
        const tooltipX = this.toolX * transform.k + transform.x;
        const tooltipY = this.toolY * transform.k + transform.y;

        this.currentTooltip.style.left = `${tooltipX}px`;
        this.currentTooltip.style.top = `${tooltipY}px`;
  		}
    }
  }
  
  handleClick(event) {
    const [mouseX, mouseY] = d3.pointer(event);        
    
    if(this.blanket){
    	if(this.isSecondEdgePinned){	// complete blanket before click?
      	this.blanketClick(event);
      } else {	// create complete blanket
      	this.pinSecondEdge(mouseX)
      }
    } else if(this.existingLine){
    	this.checkClick(event);
    }
  }

  handleDblClick(event) {
    // Get mouse coordinates relative to the SVG element
    const [mouseX, mouseY] = d3.pointer(event);
    
    // Convert the x-coordinate to the corresponding date/time using the scale
    const clickedDate = new Date(this.lastTransform.rescaleX(this.x).invert(mouseX));
       
    // Update or create line
    if (this.existingLine) {
      this.existingLine
      	.attr('x1', mouseX)
      	.attr('x2', mouseX);
    } else {
      this.createLine(mouseX, clickedDate);
    }
    // Update or create "compare" div
    if (this.existingDiv) {
      this.existingDiv.style.left = `${event.pageX}px`;
      this.existingDiv.style.top = `${event.pageY}px`;
    } else {
      this.createCheckbox(event, mouseX);
    } //else      
  }
  
  handleCheckboxChange(event, mouseX){
  	if(event.target.checked){
      if(this.firstX === null){
        this.firstX = mouseX;
        this.firstXDate = new Date(this.lastTransform.rescaleX(this.x).invert(this.firstX));
        if (this.blanket === null) {
          this.blanket = this.svg.append("rect")
            .attr("x", mouseX)
            .attr("y", 0)
            .attr("width", 0)
            .attr("height", this.height)
            .attr("fill", "grey")
            .attr("opacity", 0.6);
        }
      }
    } else {
      // Reset firstX and blanket if the checkbox is unchecked
      this.firstX = null;
      if (this.blanket) {
        this.blanket.remove();
        this.blanket = null;
      }
    }
  }

  updateBlanket(event) {
    if (this.isCompareChecked && this.firstX !== null) {
      const [mouseX, mouseY] = d3.pointer(event);
      const startX = Math.min(this.firstX, mouseX);
      const endX = Math.max(this.firstX, mouseX);
      this.blanket.attr("x", startX);
      this.blanket.attr("width", endX - startX);
    }
  }

  resetZoom() {
    this.svg.transition()
    	.duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);  
  }

  resetBlanket() {
    // Reset everything relating to blanket
    if(this.blanket){
      this.blanket.remove();
      this.blanket = null;
    }
    if(this.existingLine){
      this.existingLine.remove();
      this.existingLine = null;
    }
    if (this.existingDiv) {
      this.existingDiv.remove();
      this.existingDiv = null;
      this.isCompareChecked = false;
    }        
    // Clear tooltip and its timeout if they exist
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);        
      if (this.currentTooltip) {
        this.currentTooltip.remove(); // Remove the tooltip using higher-scope reference
        this.isTooltipDisplayed = false;
        this.currentTooltip = null;
      }
    }                
    this.firstX = null;
    this.firstXDate = null;
    this.secondX = null;
    this.secondXDate = null;
    this.isCompareChecked = false;
    this.isSecondEdgePinned = false;
  }
  
  checkClick(event){
  	let classString = '';
  	if (event.target instanceof SVGElement) {
      classString = event.target.getAttribute('class') || '';
    } else {
      classString = event.target.className || '';
    }

    if (classString !== 'vertical-line' && classString !== 'checkbox-div') {
      this.resetBlanket();
    }       
  }
  
  createCheckbox(event, mouseX){
  	const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'absolute',
      left: `${event.pageX + 10}px`,
      top: `${event.pageY}px`,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '5px'
    });
    div.className = 'checkbox-div';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', (event) => {
      let isChecked = event.target.checked;  // Capture the checkbox's state
      this.isCompareChecked = isChecked;
      this.handleCheckboxChange(event, mouseX);
		});

    const label = document.createElement('label');
    label.innerHTML = 'Compare?';

    // Append checkbox and label to checkbox-div
    div.appendChild(checkbox);
    div.appendChild(label);

    // Append the div to the body
    document.body.appendChild(div);
    this.existingDiv = div; // Store div reference for future use
  }
  
  createLine(mouseX, clickedDate){
  	this.existingLine = this.svg.append('line')
      .attr('x1', mouseX)
      .attr('x2', mouseX)
      .attr('y1', 0)
      .attr('y2', this.height)
      .attr('stroke', 'red')
      .attr('class', 'vertical-line');
    const lineDate = clickedDate;
    this.existingLine.datum({lineDate});
  }
  
  blanketClick(event){
  	const mouseX = d3.pointer(event)[0];
  	const blanketX = parseFloat(this.blanket.attr("x"));
    const blanketWidth = parseFloat(this.blanket.attr("width"));      

    if (mouseX >= blanketX && mouseX <= (blanketX + blanketWidth)) { // clicked inside blanket => display toolTip
      if(!this.isTooltipDisplayed){
        // Create tooltip if clicked inside the blanket
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.left = `${event.pageX}px`;
        tooltip.style.top = `${event.pageY - 30}px`; // Above the cursor
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        tooltip.style.color = 'white';
        tooltip.style.borderRadius = '4px';
        tooltip.style.padding = '5px';

        this.toolX = event.pageX;
        this.toolY = event.pageY - 30;

        const timeFormat = d3.timeFormat("%A %B %d, %I:%M %p");
        const startTime = timeFormat(this.firstXDate < this.secondXDate ? this.firstXDate : this.secondXDate);
        const endTime = timeFormat(this.firstXDate < this.secondXDate ? this.secondXDate : this.firstXDate);       

        tooltip.innerHTML = `From:  ${startTime}<br>To:  ${endTime}`;
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
        
        this.isTooltipDisplayed = true; // Set isTooltipDisplayed to true      	
        this.tooltipTimeout = setTimeout(() => { // Remove the tooltip after 2 seconds
          tooltip.remove();
          this.isTooltipDisplayed = false;
          this.tooltipTimeout = null;
        }, 5000);
      }            
      return; // Exit the function early
    }
    if (mouseX < blanketX || mouseX > (blanketX + blanketWidth)) { // clicked out of blanket => remove it
      this.resetBlanket();      
    }
  }
  
  pinSecondEdge(mouseX){
  	if (this.isCompareChecked && this.firstX !== null) {  // Pin second edge of blanket
      this.secondX = mouseX;
      this.secondXDate = new Date(this.lastTransform.rescaleX(this.x).invert(this.secondX));
      this.isSecondEdgePinned = true;

      // Update the blanket div
      const startX = Math.min(this.firstX, this.secondX);
      const endX = Math.max(this.firstX, this.secondX);

      if (this.blanket) {
        this.blanket
        	.attr("x", startX)
        	.attr("width", endX - startX);
      }      
      // Don't reset firstXDate & secondXDate here
      // otherwise zoomed() won't be able to transform the view
      // Remove the compare checkbox
      if (this.existingDiv) {
        this.existingDiv.remove();
        this.existingDiv = null;
        this.isCompareChecked = false;
      }    
    }
  }      
} // End View 

// =============================================================================================================//
