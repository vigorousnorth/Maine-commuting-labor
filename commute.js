var countyLines = 'rgb(200,200,200)', searchJSON = [], searchObj = [];

var timeMapped = false,  wagesMapped = false,  modeMapped = false, totalMapped = false, zoomed = false;

var badges = [
{ "name" : "highway", 
  "path" : "M12.099,0.5   c0.942,0.804,2.164,1.287,3.5,1.287s2.56-0.483,3.5-1.287l4.603,4.601c-0.849,1.203-1.345,2.67-1.345,4.254   c0,1.14,0.259,2.218,0.716,3.181c0.397,0.834,0.629,1.78,0.629,2.766c0,3.535-2.867,6.401-6.402,6.401h-1.004   c-1.695,0-3.205,0.777-4.195,2c-0.99-1.223-2.502-2-4.195-2H6.9c-3.535,0-6.4-2.866-6.4-6.401c0-0.984,0.23-1.932,0.627-2.766   c0.459-0.963,0.718-2.041,0.718-3.181c0-1.584-0.498-3.051-1.345-4.254L5.101,0.5c0.942,0.804,2.164,1.287,3.5,1.287   S11.158,1.304,12.099,0.5z"
},
{ 
  "name": "interstate", 
  "path": "M3.73,0.544c1.387,0.424,2.858,0.65,4.385,0.65   c1.525,0,2.998-0.228,4.385-0.65c1.387,0.424,2.859,0.65,4.387,0.65c1.523,0,2.996-0.228,4.383-0.65   c2.023,2.557,3.23,5.787,3.23,9.301c0,7.256-5.152,13.312-12,14.701c-6.846-1.391-12-7.445-12-14.701   c0-1.684,0.277-3.301,0.789-4.811C1.844,3.392,2.676,1.876,3.73,0.544z" 
} ];

var t = d3.transition()
    .duration(750)
    .ease(d3.easeLinear);

var projection = d3.geoAlbers()
    .center([0, 45.35])
    .rotate([68.95, 0])
    .parallels([40, 50]);   

var scalar = 0.6, mapwidth, mapheight, svg, mapAll,
  badgescale, bw = 25,
  key, gState, gStreets, gData, tractDisplay, scale, filter, path = d3.geoPath();

var keyscale = d3.scaleLinear()
    .domain([10,80]);

var timeColor = d3.scaleThreshold()
  .domain([10,20,30,40,50,60,70,80])
  .range(['#2166ac','#4393c3','#92c5de','#d1e5f0','#fddbc7','#f4a582','#d6604d','#b2182b'])

var wageColor = d3.scaleLinear()
  .domain([10,20,40])
  .range(['#eee','#43a2ca','#006d2c']);

var modeColor = d3.scaleThreshold()
  .domain([50,70,80,90,100])
  .range(['#fff','#4dac26','#a6dba0','#d01c8b','#5e3c99']);

var totalColor = d3.scaleLinear()
  .domain([2000,5000,10000])
  .range(['#ffeda0','#feb24c','#f03b20']);

window.addEventListener('DOMContentLoaded', init);

function init() {    

let k = 1, x=0, y=0;

//map containers setup
var mapwidth = parseInt(jQuery("#svgMap").width()),
  mapheight = window.innerHeight - jQuery("#svgNav").height();

mapheight = (mapheight < mapwidth * 1.1) ? 
    (mapheight - 5) : mapwidth * 1.1;

mapScale = (mapheight > mapwidth) ?  mapwidth * 13 + 100 : mapheight * 10 + 200;

horzOffset = (mapheight > mapwidth) ? mapwidth/2 - 10 : mapwidth*0.25;
vertOffset = (mapheight > mapwidth) ? 0 : 30; 

keyscale
  .range([0,mapwidth/2]);

var xAxis = d3.axisBottom()
    .scale(keyscale);

let tickSize = (mapwidth<500) ? 12 : 20; 

xAxis.tickSize( tickSize*1.1 );

projection
  .scale(mapScale)
  .translate([horzOffset , mapheight/2 - vertOffset]);

path.projection(projection);

jQuery("#svgMap").height(mapheight);

// D3 - Actually put the <svg> onto the page. Set to global in order to grab it other places.
svg = d3.select("#svgMap").append('svg')
    .attr("width", mapwidth)
    .attr("height", mapheight)
    .attr("preserveAspectRatio", "xMinYMin meet");

svg.append('defs').selectAll('path').data(badges).enter().append("path")
    .attr('d', function(d) {return d.path;})
    .attr('id',function(d) {return d.name;});

mapAll = svg.append('g').attr('id','mapall'),
  gState = mapAll.append("g").attr("id", "state"),
  gStreets = mapAll.append('g').attr('id','roads'),
  gData = mapAll.append("g").attr("id", "dataoverlay");

var tooltip = d3.select('#chart').append('div')
    .attr('class', 'hidden tooltip');

drawMap();

async function drawMap() {

  const data = await d3.csv('ACS_17_commuteData_byTown.csv');
  const state = await d3.json("https://specialprojects.pressherald.com/topojson/MaineCensusCountySubdivisions_topo.json");
  const roads = await d3.json("https://specialprojects.pressherald.com/topojson/mainehighways_geo.json")

  var portlandCenter = [];
  badgescale = mapwidth / 2500 + 0.5;
  bw = badgescale * bw;

  let totalTime = 0;
  
  data.map(d => {
    let keys = Object.keys(d);
    for (var i = keys.length - 1; i >= 2; i--) {
      d[keys[i]] = +d[keys[i]]
    };
    totalTime += d.meanTravelTime * 2 * d.totalWorkers * d.DriveAlone/100;
    return d;
  });

  let towns = topojson.feature(state, state.objects.countySubdivisions),
    statebounds = path.bounds(towns);

  let statePath = gState.append('path.countyPath')
    .datum(topojson.mesh(state, state.objects.countySubdivisions, function(a, b) { return a.properties.GEOID == b.properties.GEOID; }))
    .attr("d", path)
    .attr("class","countyPath");

  let townPaths = gState.selectAll('path.town')
    .data(towns.features)
    .enter().append('path')
    .attr("d", path)
    .attr("class","town")
    .attr('id', function(d) {
       searchJSON.push(d.properties.NAME.toUpperCase());
       searchObj.push({ "geoid"  : d.properties.GEOID, "Town" : d.properties.NAME.toUpperCase() });
       return d.properties.NAME;
    })
    .on('mouseover', function(d) { qTap(d); })
    .on('mouseleave', function(d) { qTapped(d); })
    .on('click', function(d) { showText(d.properties.GEOID); });

  var townLabels = gState.append('g').attr('id','townLabels')
    .selectAll('text.townLabels')
    .data(towns.features)
    .enter().append('g')
    .attr('class','townLabels')
    .attr('id', function(d) {
      if (d.properties.NAME == "Portland") {
        portlandCenter = path.centroid(d); 
      }
      return d.properties.NAMELSAD.replace(/\s+/g, '-') 
    })
    .attr('transform', d => 'translate(' + path.centroid(d) + ')' )
    // .attr('y', d => path.centroid(d)[1] )


  townLabels.append('circle').attr('r',2);
  townLabels.append('text')
    .attr('dx',5).attr('text-anchor','start')
    .text(d => d.properties.NAME );


    // .enter().append("text")
    // .attr('class','townLabels')
    // .attr('id', d => d.properties.NAMELSAD.replace(/\s+/g, '-') )
    // .attr('dx', 5).attr('text-anchor','start')
    // .attr('x', d => path.centroid(d)[0] )
    // .attr('y', d => path.centroid(d)[1] )
    // .text(d => d.properties.NAME );

  var roadpaths = gStreets.selectAll("path.road")
      .data(roads.features);

  roadpaths.enter().append("path")
    .attr('d', path)
    .attr('id', function(d,i) { return i; })
    .attr('class', function(d) { return 'road ' + d.properties.highway;  });

  roadpaths.enter().append('use')
    .attr('xlink:href', function(d) {return "#" + d.properties.network;})
    .attr('class', 'badge')
    .attr('transform', function(d) {
      var c = d.properties.badge_loc;
      var cx = projection(c)[0] - bw/2;
      var cy = projection(c)[1] - bw/2;
      return 'translate(' + cx + ',' + cy + ')scale(' + badgescale + ')'
    });

  roadpaths.enter().append('text')
    .text(function(d) {return d.properties.name;})
    .attr('class', 'badge_label')
    .attr('text-anchor','middle')
    .attr('dy', '0.3em')
    // .attr('dx', bw/2)
    .attr('transform', function(d) {
      var c = d.properties.badge_loc;
      return 'translate(' + projection(c) + ')'
    });

  var qTapped = function(d) {
    d3.select('g.townLabels#' + d.properties.NAMELSAD.replace(/\s+/g, '-') ).style('display','none');
  }

  var qTap = function(d) {
    // var thisDistrict = findElement(towns., 'geoid', d.properties.GEOID);
    d3.select('g.townLabels#' + d.properties.NAMELSAD.replace(/\s+/g, '-') ).style('display','block');
  }

  makeSearch();

  mapTop = scrollReady();

  mapByTime();

  function showText(z) {  
    let thisDistrict = findElement(data, 'geoid', z);
    let id = thisDistrict.geoid;
    var displayClick = "";
    if (thisDistrict) {
      var town = thisDistrict.displayName;
      displayClick = '<h2>' + town + '</h2><span id="closer">&times;</span>';
      displayClick += '<table class="clickster">'
      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Number of residents with full-time jobs:</td>' 
          + '<td class="tipRight">' + thisDistrict.totalWorkers + '</td>'
          + '</tr>' 
      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Average daily commute time:</td>' 
          + '<td class="tipRight">' + thisDistrict.meanTravelTime*2 + ' minutes</td>'
          + '</tr>'

      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Average hourly earnings:</td>' 
          + '<td class="tipRight">$' + (thisDistrict.meanEarnings/52/40).toFixed(2) + '</td>'
          + '</tr>'
      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Percentage of workers who drive alone to and from work:</td>' 
          + '<td class="tipRight">' + (thisDistrict.DriveAlone).toFixed(1) + '%</td>'
          + '</tr>'

      if (thisDistrict.meanEarnings) {

      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Annual commuting labor costs per worker in ' + town + ':</td>' 
          + '<td class="tipRight">$' + 
            numberWithCommas((thisDistrict.DriveAlone/100  // proportion of workers who drive alone
              * thisDistrict.meanEarnings/52/40 * thisDistrict.meanTravelTime * 2/60 * 5 * 52 // annual value of lost time
            ).toFixed(0)) + '</td>'
          + '</tr>' 

      displayClick += '<tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft">Total losses from all workers\' unpaid commuting time in ' + town + ':</td>' 
          + '<td class="tipRight">$' + 
            numberWithCommas((thisDistrict.totalWorkers * thisDistrict.DriveAlone/100  // proportion of workers who drive alone
              * thisDistrict.meanEarnings/52/40 * thisDistrict.meanTravelTime * 2/60 * 5 * 52 / 1000000 // annual value of lost time
            ).toFixed(1)) + ' million</td>'
          + '</tr></table>'   
      } else {displayClick += '</table><tr style="border-bottom: 1px solid #ddd; ">' 
          + '<td class="tipLeft"></td><td class="tipRight">No earnings estimates available for this town.</td></tr>'  }

       displayClick += '</table>';
    
    } else { 
      displayClick += 'No data for this town.</table>' 
    }
    
    jQuery("div#svgClick").html(displayClick);
    jQuery('span#closer').click(function() { 
      jQuery("div#svgClick").html('');
    });
  }

  function makeSearch() {  
    jQuery('#tags').click(function() { jQuery(this).val(''); });
    jQuery('#tags').click(function() { jQuery('.ui-autocomplete').hide(); });
    jQuery('#tags').keydown(function() { jQuery('#svgClick').html(''); });
    jQuery( "#tags" ).autocomplete({ 
      source: searchJSON, 
      select: function(e, ui) { 
        var thisTown = findElement(searchObj, "Town", ui.item.value.toUpperCase() );
        console.log(thisTown);
        showText(thisTown.geoid); 
      } 
    }); 
  }


  function zoomto(x, y, k) {
    if (k > 1) { zoomed = true; } else { zoomed = false; }
    
    mapAll.selectAll("circle").attr('r', 2/k);

    new_bw = bw/k;

    d3.selectAll('use.badge')
      .attr('transform', function(d) {
      var c = d.properties.badge_loc;
      var cx = projection(c)[0] - new_bw/2;
      var cy = projection(c)[1] - new_bw/2;
      return 'translate(' + cx + ',' + cy + ')scale(' + badgescale/k + ')'
    });

    d3.selectAll('text.badge_label')
      .style('font-size', 9/k + 'px');
    
    if ( mapwidth<480 ) {
      mapAll
        .attr("transform", "translate(" + mapwidth / 2 + "," + mapheight / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px")
        .style("font-size", 9 / k + "px");
    } else {    
      mapAll.transition()
        .duration(1000)
        .attr("transform", "translate(" + mapwidth / 2 + "," + mapheight / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px")
        .style("font-size", 9 / k + "px");
    }
  }

  function scrollReady() {

    mapTop = jQuery("#mapBox").offset().top - 40; // 40px is the default 'top' property for #mapBox css
   
    breakPoints = [ 
      +((jQuery("h2#wages_Portland").offset().top - window.innerHeight).toFixed(0)), 
      +((jQuery("h2#commutes_Portland").offset().top - window.innerHeight).toFixed(0)), 
      +((jQuery("h2#nondrivers").offset().top - window.innerHeight).toFixed(0)), 
      +((jQuery("h2#cumulativeloss").offset().top - window.innerHeight).toFixed(0))
    ]; 

    console.log(breakPoints); 
    
    jQuery(window).scroll(function(){
    
      console.log(zoomed);

      if (jQuery(window).scrollTop() <= breakPoints[0]) 
        { 
          if (timeMapped == false) { mapByTime(); }
          console.log(timeMapped);
          if (zoomed) { zoomto( mapwidth * 0.5, mapheight*0.5, 1); }
        } 
      else if (jQuery(window).scrollTop() > breakPoints[0] + 2 && jQuery(window).scrollTop() <= breakPoints[1] )
        // when scrollTop meets breakPoint 0 scrolling down, or breakpoint 1 scrolling up, zoom in to greater Portland and/or 
        { 
          if (timeMapped == false) { mapByTime(); }
          if (!zoomed) {  zoomto(portlandCenter[0], portlandCenter[1], 4); }
        }
      else if (jQuery(window).scrollTop() > breakPoints[1] + 2 && jQuery(window).scrollTop() <= breakPoints[2] && !wagesMapped)
        // when scrollTop meets breakPoint 0 scrolling down, or breakpoint 1 scrolling up, fire the mapByMode() function 
        { 
          mapByWages(); 
        }    
      else if (jQuery(window).scrollTop() > breakPoints[2] + 2 && jQuery(window).scrollTop() <= breakPoints[3] && !modeMapped)
        // when scrollTop meets breakPoint 0 scrolling down, or breakpoint 1 scrolling up, fire the mapByMode() function 
        { 
          if (zoomed) { zoomto( mapwidth * 0.5, mapheight*0.5, 1); } 
          mapByMode(); 
        } 
      else if (jQuery(window).scrollTop() > breakPoints[3] + 2 && !totalMapped)
        { 
          mapByTotal(); 
        } 
      else {
        return false;
      }
    });

    return mapTop;
  }

  function mapByTime() {
    timeMapped = true;
    wagesMapped = false;
    modeMapped = false;
    totalMapped = false;

    console.log('showing time by town');
    jQuery("div#svgClick").html('');
    
    mapAll.selectAll("path.town")
      .transition(t)
      .attr('fill', d => {
        let tractID = d.properties.GEOID;
        let d0 = findElement(data, 'geoid', tractID);
        // console.log(d0);
        return ((typeof(d0.meanTravelTime) == 'number') && d0.meanTravelTime) ?
            timeColor(d0.meanTravelTime * 2) : '#ccc';
      })
      .style('fill-opacity', 1);

    drawTimeKey();

  }

  function mapByWages() {
    timeMapped = false; wagesMapped = true; modeMapped = false; totalMapped = false;

    console.log('showing wages by town');
    jQuery("div#svgClick").html('');
    
    mapAll.selectAll("path.town")
      .transition(t)
      .attr('fill', d => {
        let tractID = d.properties.GEOID;
        let d0 = findElement(data, 'geoid', tractID);
        // console.log(d0);
        return ((typeof(d0.meanEarnings) == 'number') && d0.meanEarnings) ?
            wageColor(d0.meanEarnings/52/40) : '#ccc';
      })
      .style('fill-opacity', 0.8);

    drawWageKey();

  }

  function mapByMode() {
    timeMapped = false; wagesMapped = false; modeMapped = true; totalMapped = false;

    console.log('showing modes by town');
    jQuery("div#svgClick").html('');
    
    mapAll.selectAll("path.town")
      .transition(t)
      .attr('fill', d => {
        let tractID = d.properties.GEOID;
        let d0 = findElement(data, 'geoid', tractID);
        // console.log(d0);
        return ((typeof(d0.DriveAlone) == 'number') && d0.DriveAlone )  ?
            modeColor(d0.DriveAlone) : '#ccc';
      })
      .style('fill-opacity', 0.8);

    drawModeKey();

  }

  function mapByTotal() {
    timeMapped = false; wagesMapped = false; modeMapped = false; totalMapped = true;

    jQuery("div#svgClick").html('');
    
    mapAll.selectAll("path.town")
      .transition(t)
      .attr('fill', d => {
        let tractID = d.properties.GEOID;
        let d0 = findElement(data, 'geoid', tractID);
        // console.log(d0);
        return ((typeof(d0.DriveAlone) == 'number') && d0.DriveAlone && (typeof(d0.meanEarnings) == 'number') && d0.meanEarnings ) 
          ?
          totalColor(d0.DriveAlone/100 * d0.meanEarnings/52/40 * d0.meanTravelTime * 2/60 * 5 * 52) : '#ccc';
      })
      .style('fill-opacity', 0.8);

    drawTotalKey();

  }

}; // end of async function

let legend = svg.append('g').attr('class','legend')
  .attr('transform', 'translate(' + (mapwidth/2 - 10 - tickSize) + ',' + (mapheight * 0.95 - 60 - vertOffset) + ')');  

let legendTitle = legend.append('text').attr('id','legendTitle')
  .attr('x',0).attr('y','-2.0em').attr('fill','#000')
  .attr('text-anchor','start')



function drawTimeKey() {
  
  keyscale.domain([10,80]);

  legendTitle.selectAll('tspan').remove();
  legendTitle.append('tspan').text('Average daily time spent commuting, per worker (minutes)');
  
  legend.selectAll("rect").remove();
  legend.selectAll("g.tick").remove();

  legend.selectAll("rect.keyblock")
    .data(d3.pairs(keyscale.ticks(30)))
    .enter().append("rect")
     .attr('class','keyblock')
     .attr("height", tickSize )
     .attr("x", function(d) { return keyscale(d[0]); })
     .attr("width", function(d) { return (keyscale(d[1]) - keyscale(d[0])); })
     .style("fill", function(d) { return timeColor( d[0]+(d[1]-d[0])/2); });

  legend.call(xAxis.ticks(6).tickFormat(d => d));
}


function drawWageKey() {
  
  keyscale.domain([10,40])

  legendTitle.selectAll('tspan').remove();
  legendTitle.append('tspan').text('Average hourly earnings among full-time workers');
  
  legend.selectAll("rect").remove();
  legend.selectAll("g.tick").remove();

  legend.selectAll("rect.keyblock")
    .data(d3.pairs(keyscale.ticks(30)))
    .enter().append("rect")
     .attr('class','keyblock')
     .attr("height", tickSize )
     .attr("x", function(d) { return keyscale(d[0]); })
     .attr("width", function(d) { return (keyscale(d[1]) - keyscale(d[0])); })
     .style("fill", function(d) { return wageColor( d[0]+(d[1]-d[0])/2); });

  
  legend.call(xAxis.ticks(5).tickFormat(d => "$"+d));
}

function drawModeKey() {
  keyscale.domain([60,100]);
  
  legendTitle.selectAll('tspan').remove();

  legendTitle.append('tspan').text('% of workers who drive alone to/from work');
  
  
  legend.selectAll("rect").remove();
  legend.selectAll("g.tick").remove();

  legend.selectAll("rect.keyblock")
    .data(d3.pairs(keyscale.ticks(30)))
    .enter().append("rect")
     .attr('class','keyblock')
     .attr("height", tickSize )
     .attr("x", function(d) { return keyscale(d[0]); })
     .attr("width", function(d) { return (keyscale(d[1]) - keyscale(d[0])); })
     .style("fill", function(d) { return modeColor( d[0]+(d[1]-d[0])/2); });

  legend.call(xAxis.tickFormat(d => d+"%"));
}

function drawTotalKey() {
  
  keyscale.domain([2000,10000]);
  
  legendTitle.selectAll('tspan').remove();
  legendTitle.append('tspan').text('Annual commuting labor costs per worker:');
  
  legend.selectAll("rect").remove();
  legend.selectAll("g.tick").remove();

  legend.selectAll("rect.keyblock")
    .data(d3.pairs(keyscale.ticks(30)))
    .enter().append("rect")
     .attr('class','keyblock')
     .attr("height", tickSize )
     .attr("x", function(d) { return keyscale(d[0]); })
     .attr("width", function(d) { return (keyscale(d[1]) - keyscale(d[0])); })
     .style("fill", function(d) { return totalColor( d[0]+(d[1]-d[0])/2); });

  legend.call(xAxis.ticks(10).tickFormat(d => "$" + (d/1000).toFixed(0) + 'K'));
}

} // end of init function


function numberWithCommas(x) {
  if (typeof x !== 'undefined') {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  } else {
    return(x);
  }
}

function findElement(arr, propName, propValue) {
  var returnVal = false;
  for (var i=0; i < arr.length; i++) {
    if (arr[i][propName] === propValue) {
          returnVal = arr[i];
      }
  } 
  return returnVal;
}
