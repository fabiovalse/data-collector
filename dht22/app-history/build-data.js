#!/usr/bin/env node
/**
 * Aggregates hourly DHT22 sensor readings into daily summaries
 * for the weather wheel visualization.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'data.json');
const OUTPUT_BY_YEAR = path.join(__dirname, 'data-by-year.json');

const years = ['2024', '2025', '2026'];

// Plausible range for an indoor DHT22 sensor
const TEMP_MIN = 14;
const TEMP_MAX = 45;
const HUMIDITY_MIN = 10;
const HUMIDITY_MAX = 100;

function readSensorFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    // Files contain a JSON-encoded string of a JSON object
    const parsed = JSON.parse(JSON.parse(raw));
    return {
      temperature: parsed.temperature,
      humidity: parsed.humidity
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
        // Parse filename: dht22_YYYY-MM-DD_HH.json
        const match = file.match(/dht22_(\d{4}-\d{2}-\d{2})_(\d{2})\.json/);
        if (!match) continue;

        const date = match[1];
        const reading = readSensorFile(path.join(monthDir, file));
        if (!reading || reading.temperature == null) continue;

        if (!dailyData[date]) {
          dailyData[date] = { temps: [], humidities: [] };
        }
        // Discard readings outside plausible range
        if (reading.temperature >= TEMP_MIN && reading.temperature <= TEMP_MAX) {
          dailyData[date].temps.push(reading.temperature);
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
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
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
