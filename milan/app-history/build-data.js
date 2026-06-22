#!/usr/bin/env node
/**
 * Aggregates OpenWeatherMap readings for Milan into daily summaries
 * for the weather wheel visualization.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'data.json');
const OUTPUT_BY_YEAR = path.join(__dirname, 'data-by-year.json');

const years = ['2021', '2022', '2023', '2024', '2025', '2026'];

// Plausible range for Milan outdoor weather
const TEMP_MIN = -15;
const TEMP_MAX = 50;
const HUMIDITY_MIN = 0;
const HUMIDITY_MAX = 100;

function kelvinToCelsius(k) {
  return k - 273.15;
}

function readSensorFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.main) return null;
    return {
      temp: kelvinToCelsius(data.main.temp),
      tempMin: kelvinToCelsius(data.main.temp_min),
      tempMax: kelvinToCelsius(data.main.temp_max),
      humidity: data.main.humidity,
      wind: data.wind ? data.wind.speed : null,
      weather: data.weather && data.weather[0] ? data.weather[0].main : null,
    };
  } catch (e) {
    return null;
  }
}

function aggregateData() {
  const dailyData = {};

  for (const year of years) {
    const yearDir = path.join(BASE_DIR, year);
    if (!fs.existsSync(yearDir)) continue;

    const months = fs.readdirSync(yearDir).filter(m => /^\d{2}$/.test(m)).sort();

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.json')).sort();

      for (const file of files) {
        // Parse filename: milan_YYYY-MM-DD_HH.json
        const match = file.match(/milan_(\d{4}-\d{2}-\d{2})_(\d{2})\.json/);
        if (!match) continue;

        const date = match[1];
        const reading = readSensorFile(path.join(monthDir, file));
        if (!reading) continue;

        if (!dailyData[date]) {
          dailyData[date] = { temps: [], humidities: [] };
        }

        // Use the reported temp, filter to plausible range
        if (reading.temp >= TEMP_MIN && reading.temp <= TEMP_MAX) {
          dailyData[date].temps.push(reading.temp);
        }
        if (reading.tempMin >= TEMP_MIN && reading.tempMin <= TEMP_MAX) {
          dailyData[date].temps.push(reading.tempMin);
        }
        if (reading.tempMax >= TEMP_MIN && reading.tempMax <= TEMP_MAX) {
          dailyData[date].temps.push(reading.tempMax);
        }
        if (reading.humidity != null && reading.humidity >= HUMIDITY_MIN && reading.humidity <= HUMIDITY_MAX) {
          dailyData[date].humidities.push(reading.humidity);
        }
      }
    }
  }

  // Compute daily min, max, mean (skip days with no valid readings)
  const result = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, data]) => data.temps.length > 0)
    .map(([date, data]) => {
      const temps = data.temps;
      const humidities = data.humidities;
      return {
        date,
        minTemp: +Math.min(...temps).toFixed(1),
        maxTemp: +Math.max(...temps).toFixed(1),
        meanTemp: +(temps.reduce((s, v) => s + v, 0) / temps.length).toFixed(1),
        minHumidity: humidities.length ? Math.min(...humidities) : null,
        maxHumidity: humidities.length ? Math.max(...humidities) : null,
        meanHumidity: humidities.length
          ? +(humidities.reduce((s, v) => s + v, 0) / humidities.length).toFixed(1)
          : null,
        readings: temps.length
      };
    });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Written ${result.length} daily records to ${OUTPUT_FILE}`);
  console.log(`Date range: ${result[0].date} to ${result[result.length - 1].date}`);

  // Group by year for the weather wheel
  const byYear = {};
  result.forEach(d => {
    const year = d.date.slice(0, 4);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(d);
  });
  fs.writeFileSync(OUTPUT_BY_YEAR, JSON.stringify(byYear, null, 2));
  console.log(`Written year-grouped data to ${OUTPUT_BY_YEAR}`);
  console.log('Years:', Object.keys(byYear).map(y => `${y}: ${byYear[y].length} days`).join(', '));
}

aggregateData();
