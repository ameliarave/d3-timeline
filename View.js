class View {

  constructor(startDate, endDate, svgElement) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.svg = svgElement;

    this.States = {
      IDLE: 'idle',
      DATE_SELECTED: 'date selected',
      BUILDING_RANGE: 'building range',
      RANGE_SELECTED: 'range selected'
    };                   

    // binding
    this.setBuildingRange = this.setBuildingRange.bind(this);
    this.setIdle = this.setIdle.bind(this);
    this.setDateSelected = this.setDateSelected.bind(this);
    this.updateDateSelected = this.updateDateSelected.bind(this);
    this.setRangeSelected = this.setRangeSelected.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleLongPress = this.handleLongPress.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
    this.updateBlanket = this.updateBlanket.bind(this);
    this.resetZoom = this.resetZoom.bind(this);
    this.zoomed = this.zoomed.bind(this);
    this.blanketClick = this.blanketClick.bind(this);
    this.pinSecondEdge = this.pinSecondEdge.bind(this);
    this.printState = this.printState.bind(this);    
    this.resetBlanket = this.resetBlanket.bind(this);
    this.clickOut = this.clickOut.bind(this);
    this.createCheckbox = this.createCheckbox.bind(this);
    this.createLine = this.createLine.bind(this);            

    this.init();
    this.bindEvents();
  }

  init() {        
    // Initialize x and y scales, axis, etc.
    this.clickDelay = 250;
    this.clickTimer = null;
    this.pressTimer = null;
    this.width = 1161;
    this.height = 605.12;
    this.existingLine = null; // Accessible by all code after this definition
    this.existingDiv = null; 
    this.dragBuffer = null;
    this.isCompareChecked = false;    
    this.blanket = null;
    this.mouseX = null;
    this.isSecondEdgePinned = false;
    this.isTooltipDisplayed = false;
    this.tooltipTimeout = null;  // Accessible by all code after this definition
    this.currentTooltip = null;
    this.lastTransform = d3.zoomIdentity;
    this.toolX = null;
    this.toolY = null;
    this.longPress = false;

    this.currentState = {
      state: this.States.IDLE,
      date_1: null, // Date() Object
      date_2: null, // Date() Object
      x_1: null, // mouse coordinate
      x_2: null // mouse coordinate
    }

    // Set up SVG, scales, and axes.
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
      .attr("width", this.width +1)
      .attr("height", this.height +1);

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
      
    this.drag = d3.drag()
      .on("start", this.dragStart.bind(this))
      .on("drag", this.dragging.bind(this))
      .on("end", this.dragEnd.bind(this));  
      
    d3.selection.prototype.moveToFront = function() {
      return this.each(function() {
        this.parentNode.appendChild(this);
      });
    };
  } // init

  bindEvents() {
    this.svg.call(this.zoom);
    this.svg.on("dblclick.zoom", null);              

    this.view.on("pointerdown", (event) => {
      this.longPress = false;
      this.handlePointerDown(event);
    });

    this.view.on("pointerup", (event) => {
      if(!this.longPress){
        this.handleClick(event);
      }
      this.handlePointerUp();
    }); 

    this.svg.on("mousemove", (event) => {
      if(this.blanket){
        this.updateBlanket(event);
      }      
    });        

    document.getElementById('resetButton').addEventListener('click', () => {
      this.resetZoom();
      this.resetBlanket();
      this.setIdle(this.currentState);
      this.printState(this.currentState);
    });      
  } // bindEvents

  // ======================================================VVVV EVENT HANDLERS VVVV==================================================== //

  handlePointerDown(event) {
    this.initialPoint = d3.pointer(event)[0];
    this.currentPoint = this.initialPoint; // Initialize to initialPoin

    const updatePoint = (event) => {
      this.currentPoint = d3.pointer(event)[0];
    };
    // Listen for any pointer movements to update currentPoint
    this.svg.on("pointermove.temp", updatePoint);
    // Start a timer
    this.pressTimer = setTimeout(() => {
      if (Math.abs(this.currentPoint - this.initialPoint) < 10) {
        this.handleLongPress(event);
        this.longPress = true;
      }
      // Remove the temporary "pointermove" listener
      this.svg.on("pointermove.temp", null);
    }, 600);  // 1-second delay
  }

  handlePointerUp() {    
    // Clear the timer
    if (this.pressTimer !== null) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
    // Remove the temporary "pointermove" listener just in case
    this.svg.on("pointermove.temp", null);
    this.initialPoint = null;
    this.currentPoint = null;
  }


  dragStart(event) {
    // Change line color to give it a "highlighted" look
    this.existingLine.attr("stroke", "red");

    // Increase line width to make it more visible
    this.existingLine.attr("stroke-width", 4);    
  }

  dragging(event) {
    // During drag
    this.mouseX = d3.pointer(event)[0];    
    this.existingLine.attr("x1", this.mouseX).attr("x2", this.mouseX);
    this.dragBuffer.attr("x", this.mouseX - 5);
    this.existingDiv.style.left = `${this.mouseX + 10}px`;    
  }

  dragEnd(event) {
    // Revert the line to its original state
    this.existingLine.attr("stroke", "red");
    this.existingLine.attr("stroke-width", 1);
    this.mouseX = d3.pointer(event)[0];
    this.currentState = {
        ...this.currentState,
        date_1: new Date(this.lastTransform.rescaleX(this.x).invert(this.mouseX)),        
        x_1: this.mouseX
    };
  }

  handleClick(event) {
    //console.log("Handle click");
    this.mouseX = d3.pointer(event)[0];

    switch (this.currentState.state){    	
      case this.States.IDLE:
        // nothing
        break;
      case this.States.DATE_SELECTED:      	      	              
        if(this.existingLine && this.clickOut(event) === true){ // check location of click  
          this.setIdle(); 
        } // else: clicked on line or box => do nothing, state remains date_selected        
        break;
      case this.States.BUILDING_RANGE:
        this.setRangeSelected();
        //console.log("Second click (handleClick): ", this.mouseX);
        break;
      case this.States.RANGE_SELECTED:      	
        this.blanketClick(event);  // check location of click   
        break;
    }    
    // ========== Print State ============ //
    this.printState();
    // ========== Print State ============ //   
  } 

  handleLongPress(event) {       
    this.mouseX = d3.pointer(event)[0]; // Mouse X coordinate relative to the SVG element      
    const clickedDate = new Date(this.lastTransform.rescaleX(this.x).invert(this.mouseX));

    switch (this.currentState.state){    	
      case this.States.IDLE:
        this.setDateSelected(event, clickedDate);        
        break;
      case this.States.DATE_SELECTED: 
        this.updateDateSelected(event, clickedDate);
        break;
      case this.States.BUILDING_RANGE:
        // nothing yet
        break;
      case this.States.RANGE_SELECTED:
        // nothing yet
        break;
    } // Switch      

    // ========== Print State ============ //    
    this.printState();
  }

  handleCheckboxChange(event){  	
    if(event.target.checked){
      this.setBuildingRange();  // set state to BUILDING_RANGE so 2nd edge gets pinned in handleClick()   
    } else {
      this.setDateSelected(event, this.currentState.date_1)
    }
    // ========== Print State ============ // 
    this.printState();
    // ========== Print State ============ // 
  }

  updateBlanket(event) {
    if (this.isCompareChecked) { // set to false when 2nd edge pinned
      this.mouseX = d3.pointer(event)[0];
      const x_1 = this.currentState.x_1;
      const startX = Math.min(x_1,this. mouseX);
      const endX = Math.max(x_1, this.mouseX);
      this.blanket.attr("x", startX);
      this.blanket.attr("width", endX - startX);
      this.blanket.moveToFront();
    }    
  }

  resetZoom() {
    this.svg.transition()
      .duration(750)
      .call(this.zoom.transform, d3.zoomIdentity);  
  }   

  // ======================================================^^^^ EVENT HANDLERS ^^^^==================================================== //

  // ================================================================================================================================= //
  // ======================================================VVVV STATE SETTERS VVVV==================================================== //     

  setIdle(){
    if (this.currentState.state === this.States.DATE_SELECTED){ // DATE_SELECTED => IDLE      
      // remove existing line
      this.resetBlanket();
      this.currentState = {	// update state 
        ...this.currentState,
        state: this.States.IDLE,
        date_1: null,
        x_1: null,
      };       
    } else if (this.currentState.state === this.States.RANGE_SELECTED){ // RANGE_SELECTED => IDLE
      this.currentState = {	// update state 
        ...this.currentState,
        state: this.States.IDLE,
        date_1: null,
        date_2: null,
        x_1: null,
        x_2: null
      };      
    }
  }

  setDateSelected(event, clickedDate){
    if(this.currentState.state === this.States.IDLE){ // IDLE => DATE_SELECTED
      this.createLine(clickedDate);
      this.createCheckbox(event);
      this.currentState = {
        ...this.currentState,
        state: this.States.DATE_SELECTED,
        date_1: clickedDate,        
        x_1: this.mouseX
      };
    } else if (this.currentState.state === this.States.BUILDING_RANGE){ // BUILDING_RANGE => DATE_SELECTED
        // went from blanket (w/o 2nd edge pinned) to just date selected
        this.blanket.remove();
        this.blanket = null;
        this.currentState = {
        ...this.currentState,
        state: this.States.DATE_SELECTED // date_1 & date_2 remain same from prev state
      };
    }
  }

  //  Function for when a Date is already selected, and received new DBLclick => update Line & Div, set date_1
  updateDateSelected(event, clickedDate){
    //console.log("First Click: ", this.mouseX);
    this.existingLine // update line
      .attr('x1', this.mouseX)
      .attr('x2', this.mouseX)      
    this.dragBuffer
      .attr('x', this.mouseX - 5);
    this.existingDiv.style.left = `${event.pageX}px`; // update compare div
    this.existingDiv.style.top = `${event.pageY}px`;
    this.currentState = {
        ...this.currentState,
        date_1: clickedDate,
        x_1: this.mouseX
    };
  }

  setBuildingRange(){ // called from handleCheckboxChange
    if(this.currentState.state === this.States.DATE_SELECTED){ 
      // set state to building ... second edge not pinned yet
      this.currentState = {
        ...this.currentState,
        state: this.States.BUILDING_RANGE  
        }; 
      this.blanket = this.svg.append("rect")
        .attr("x", this.mouseX)
        .attr("y", 0)
        .attr("width", 0)
        .attr("height", this.height)
        .attr("fill", "grey")
        .attr("opacity", 0.6);
        this.blanket.on("click", (event) => {
        event.stopPropagation();
        this.mouseX = d3.pointer(event)[0];
        //console.log("Second Click (in blanket listener): ", this.mouseX);
        this.handleClick(event);  // Manually call the handleClick function
      });
      this.dragBuffer.on('.drag', null);
    }      
  }

  setRangeSelected(){
    // pin second edge 
    let tempDate = new Date(this.lastTransform.rescaleX(this.x).invert(this.mouseX));
    this.pinSecondEdge(this.mouseX);
    this.currentState = {
        ...this.currentState,
        state: this.States.RANGE_SELECTED, // date_1 same from prev state
        date_2: new Date(this.lastTransform.rescaleX(this.x).invert(this.mouseX)),
        x_2: this.mouseX
      };
  }

  // ================================================================================================================================= //
  // ======================================================^^^^ STATE SETTERS ^^^^==================================================== //     

  pinSecondEdge(){
    this.blanket.moveToFront();  
    const x_1 = this.currentState.x_1;
    const mouse = this.mouseX;

    if (this.isCompareChecked) {      
      this.isSecondEdgePinned = true;
      this.dragBuffer.on('.drag', null);
      const startX = Math.min(x_1, mouse);
      const endX = Math.max(x_1, mouse);

      if (this.blanket) { // Update the blanket div
        this.blanket
          .attr("x", startX)
          .attr("width", endX - startX);
      }  
      // Remove the compare checkbox
      if (this.existingDiv) {
        this.existingDiv.remove();
        this.existingDiv = null;
        this.isCompareChecked = false;
      }    
    }
  }    

  zoomed(event) {
    const { transform } = event;
    this.lastTransform = transform;  // Update the last transform    
    this.view.attr("transform", transform);
    this.gX.call(this.xAxis.scale(this.lastTransform.rescaleX(this.x)));
    this.gY.call(this.yAxis.scale(this.lastTransform.rescaleY(this.y)));    

    if(this.existingLine){
      this.transformLine(event.pageY);
    }    
    // Update positions of blanket edge(s)
    if (this.blanket){
      this.transformBlanket();
    }        
    } // zoomed

    transformLine(pageY){
    const lineDateOrig = this.existingLine.datum().lineDate;
    const newX = this.lastTransform.rescaleX(this.x)(lineDateOrig);      
    this.existingLine
      .attr('x1', newX)
      .attr('x2', newX);    
    this.dragBuffer.attr("x", newX - 5); // Transform the dragBuffer as well
    if(this.existingDiv){
      const svgRect = this.svg.node().getBoundingClientRect();
      const lineRect = this.existingLine.node().getBoundingClientRect();
      const newDivX = lineRect.left - svgRect.left;
      const newDivY = lineRect.top - svgRect.top; // Doesn't work properly for existingDiv.top transform
      this.existingDiv.style.left = `${newDivX + 15}px`;
      this.existingDiv.style.top = `${pageY - (this.existingDiv.offsetHeight / 2)}px`;
    }
  }

  transformBlanket(){
    const date_1 = this.currentState.date_1;
    const x_1 = this.lastTransform.rescaleX(this.x)(date_1);
    this.currentState = {
        ...this.currentState,
        x_1: x_1   
      };
    if(!this.isSecondEdgePinned){
      this.blanket.attr("x", x_1);
    } else {
      const date_2 = this.currentState.date_2
      const x_2 = this.lastTransform.rescaleX(this.x)(date_2);     
      this.blanket.attr("x", Math.min(x_1, x_2));
      this.blanket.attr("width", Math.abs(x_2 - x_1)); 
      if (this.isTooltipDisplayed) { // tooltip can only be displayed if full blanket
        const tooltipX = this.toolX * this.lastTransform.k + this.lastTransform.x;
        const tooltipY = this.toolY * this.lastTransform.k + this.lastTransform.y;
        this.currentTooltip.style.left = `${tooltipX}px`;
        this.currentTooltip.style.top = `${tooltipY}px`;
      }
    }  	    
  }

  blanketClick(event){
    this.mouseX = d3.pointer(event)[0];
    let blanketX = parseFloat(this.blanket.attr("x"));
    let blanketWidth = parseFloat(this.blanket.attr("width"));
    let click = parseFloat(this.mouseX);
    // Round to 4 decimal places
    blanketX = parseFloat(blanketX.toFixed(4));
    blanketWidth = parseFloat(blanketWidth.toFixed(4));
    click = parseFloat(click.toFixed(4));

    if (click >= blanketX && click <= (blanketX + blanketWidth)) { // clicked inside blanket => display toolTip
      //console.log("clicked inside blanket");
      if(!this.isTooltipDisplayed){
        // Create tooltip
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
        const date_1 = this.currentState.date_1;
        const date_2 = this.currentState.date_2;
        const startTime = timeFormat(date_1 < date_2 ? date_1 : date_2);
        const endTime = timeFormat(date_1 < date_2 ? date_2 : date_1);       

        tooltip.innerHTML = `From:  ${startTime}<br>To:  ${endTime}`;
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
        
        this.isTooltipDisplayed = true;     	
        this.tooltipTimeout = setTimeout(() => { // Remove the tooltip after 2 seconds
          tooltip.remove();
          this.isTooltipDisplayed = false;
          this.tooltipTimeout = null;
        }, 5000);
      }            
      return; // Exit the function early
    }
    if (click < blanketX || click > (blanketX + blanketWidth)) { // clicked out of blanket => remove it
      //console.log("clicked outside blanket");
      this.setIdle(); // set Idle state
      this.resetBlanket();      
    }
  }    

  printState(){
    let date1 = null;
    let date2 = null;
    let x_1 = null;
    let x_2 = null;
    if(this.currentState.date_1){
      date1 = this.currentState.date_1.toLocaleString();
    }
    if(this.currentState.date_2){
      date2 = this.currentState.date_2.toLocaleString();
    }
    if(this.currentState.x_1){
      x_1 = this.currentState.x_1;
    }
    if(this.currentState.x_2){
      x_2 = this.currentState.x_2;
    }
    console.log(this.currentState.state, "Date_1: ", date1, "Date_2: ", date2, "x_1: ", x_1, "x_2: ", x_2);
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
    if(this.dragBuffer){
      this.dragBuffer.remove();
      this.dragBuffer = null;
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
    this.isCompareChecked = false;
    this.isSecondEdgePinned = false;
    this.mouseX = null;
    }

    clickOut(event){
    let classString = '';
    if (event.target instanceof SVGElement) {
      classString = event.target.getAttribute('class') || '';
    } else {
      classString = '';
    }

    if (classString !== 'vertical-line' && classString !== 'checkbox-div') {
      // return true (yes clicked on backgrounnd..should reset)
      return true;
    } else{ // return false (clicked on line or checkbox, don't reset)    	
      return false;
    }
  }

  createCheckbox(event){
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
      this.isCompareChecked = event.target.checked; // Capture the checkbox's state
      this.handleCheckboxChange(event);
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

  createLine(clickedDate){
    const mouse = this.mouseX;
    if(!this.existingLine){
      this.existingLine = this.svg.append('line')
        .attr('x1', mouse)
        .attr('x2', mouse)
        .attr('y1', 0)
        .attr('y2', this.height)
        .attr('stroke', 'red')
        .attr('stroke-width', 1)
        .attr('class', 'vertical-line');
      const lineDate = clickedDate;
      this.existingLine.datum({lineDate});
      // Invisible buffer for dragging
      this.dragBuffer = this.svg.append("rect")
        .attr("x", mouse - 5) // 5 pixels to the left of the line
        .attr("y", 0)
        .attr("width", 10) // 10 pixels width (5 on each side of the line)
        .attr("height", this.height)
        .attr("opacity", 0); // invisible
      this.dragBuffer.call(this.drag);  // Attach drag behavior to buffer
    }
  }
} // End View 
