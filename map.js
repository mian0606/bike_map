import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


mapboxgl.accessToken = 'pk.eyJ1IjoibWlhbnoiLCJhIjoiY21wM3M1djUyMHFnMjJyb2ljYTQ1dnUzaSJ9.EvI1jxpzULjz8K1EmpTgfQ';


const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});


map.on('load', async () => {
  const bikeLaneStyle = {
    'line-color': '#32D400',
    'line-width': 3,
    'line-opacity': 0.5,
  };

  // Boston bike lanes
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle,
  });

  // Cambridge bike lanes
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://data.cambridgema.gov/resource/2s45-2dbh.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle,
  });

  //previous code
  let jsonData;
  try {
    const jsonurl = "./bluebikes-stations.json";

    // Await JSON fetch
    const jsonData = await d3.json(jsonurl);

    console.log('Loaded JSON Data:', jsonData); // Log to verify structure
  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }

  const stationFlow = d3
    .scaleQuantize()
    .domain([0, 1])
    .range([0, 0.5, 1]);
});

const svg = d3.select('#map').select('svg');
let stations = jsonData.data.stations;
console.log('Stations Array:', stations);

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}
const circles = svg
  .selectAll('circle')
  .data(stations, (d) => d.short_name)
  .enter()
  .append('circle')
  .attr('r', 5) // Radius of the circle
  .style('--departure-ratio', (d) =>
    stationFlow(d.departures / d.totalTraffic),
  );
  .attr('fill', 'steelblue') // Circle fill color
  .attr('stroke', 'white') // Circle border color
  .attr('stroke-width', 1) // Circle border thickness
  .attr('opacity', 0.8); // Circle opacity


function updatePositions() {
  circles
    .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
    .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
}

updatePositions();

map.on('move', updatePositions); // Update during map movement
map.on('zoom', updatePositions); // Update during zooming
map.on('resize', updatePositions); // Update on window resize
map.on('moveend', updatePositions); // Final adjustment after movement ends









stations = stations.map((station) => {
  let id = station.short_name;
  station.arrivals = arrivals.get(id) ?? 0;
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);
  const circles = svg
    .selectAll('circle')
    // all other previously defined attributes omitted for brevity
    .each(function (d) {
    // Add <title> for browser tooltips
      d3.select(this)
        .append('title')
        .text(
          `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
        );
    });
  return station;
});



function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}
const timeSlider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');
const anyTimeLabel = document.getElementById('any-time');


function updateTimeDisplay() {
  const timeFilter = Number(timeSlider.value);

  if (timeFilter === -1) {
    selectedTime.textContent = '';
    anyTimeLabel.style.display = 'block';
  } else {
    selectedTime.textContent = formatTime(timeFilter);
    anyTimeLabel.style.display = 'none';
  }

  updateScatterPlot(timeFilter);
}

timeSlider.addEventListener('input', updateTimeDisplay);
updateTimeDisplay();



function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    let id = station.short_name;

    station.departures = departures.get(id) ?? 0;
    station.arrivals = arrivals.get(id) ?? 0;
    station.totalTraffic = station.departures + station.arrivals;

    return station;
  });
}


function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);

        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

let trips = await d3.csv(
  'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
  (trip) => {
    trip.started_at = new Date(trip.started_at);
    trip.ended_at = new Date(trip.ended_at);
    return trip;
  },
);
function updateScatterPlot(timeFilter) {
  const filteredTrips = filterTripsbyTime(trips, timeFilter);
  const filteredStations = computeStationTraffic(stations, filteredTrips);

  timeFilter === -1
    ? radiusScale.range([0, 25])
    : radiusScale.range([3, 50]);

  circles
    .data(filteredStations, (d) => d.short_name)
    .join('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic));
}


updateScatterPlot(timeFilter);