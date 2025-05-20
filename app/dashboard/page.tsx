"use client";

import { JSX, useEffect, useState } from "react";
import Head from "next/head";
import Papa, { ParseResult } from "papaparse";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  ChartData,
  ChartOptions,
  TooltipItem,
  ChartEvent,
  ActiveElement,
} from "chart.js";

// Define types for CSV data
interface RawCsvRow {
  Year: string;
  Month: string;
  Day: string;
  Category: string;
  "Material Type": string;
  "Weight (lbs)": string;
  Vendor: string;
  "Date Updated": string;
  Cost: string;
  Notes: string;
  [key: string]: string;
}

interface ProcessedDataRow {
  Year: number;
  Month: string;
  Day: string;
  Category: string;
  "Material Type": string;
  "Weight (lbs)": number;
  Vendor: string;
  "Date Updated": string;
  Cost: number;
  Notes: string;
}

interface DashboardChartData {
  categoryWeight: ChartData<"bar", number[], string> | null;
  materialTypeDistribution: ChartData<"pie", number[], string> | null;
  yearlyTrend: ChartData<"line", number[], string> | null;
  topVendors: ChartData<"bar", number[], string> | null;
  categoryTrendsOverYears: ChartData<"line", number[], string> | null;
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Neon color palette
const neonColors = {
  pink: "rgba(255, 0, 255, 0.7)",
  pinkBorder: "rgb(255, 0, 255)",
  pinkHoverFill: "rgb(255, 0, 255)",
  pinkHoverBorder: "rgb(230, 230, 250)",

  green: "rgba(57, 255, 20, 0.7)",
  greenBorder: "rgb(57, 255, 20)",
  greenPointHoverFill: "rgb(57, 255, 20)",
  greenPointHoverBorder: "rgb(255, 255, 255)",

  blue: "rgba(0, 200, 255, 0.7)",
  blueBorder: "rgb(0, 200, 255)",
  blueHoverFill: "rgb(0, 200, 255)",
  blueHoverBorder: "rgb(230, 230, 250)",

  yellow: "rgba(255, 240, 31, 0.7)",
  yellowBorder: "rgb(255, 240, 31)",
  yellowHoverFill: "rgb(255, 240, 31)",
  yellowHoverBorder: "rgb(230,230,250)",

  orange: "rgba(255, 172, 28, 0.7)",
  orangeBorder: "rgb(255, 172, 28)",
  orangeHoverFill: "rgb(255, 172, 28)",
  orangeHoverBorder: "rgb(230,230,250)",

  purple: "rgba(191, 0, 255, 0.7)",
  purpleBorder: "rgb(191, 0, 255)",
  purpleHoverFill: "rgb(191, 0, 255)",
  purpleHoverBorder: "rgb(230,230,250)",

  lightBlue: "rgba(0, 255, 255, 0.7)", // Cyan
  lightBlueBorder: "rgb(0, 255, 255)",
  lightBlueHoverFill: "rgb(0, 255, 255)",
  lightBlueHoverBorder: "rgb(230,230,250)",
};

const neonPalette = [
  neonColors.pink,
  neonColors.green,
  neonColors.blue,
  neonColors.yellow,
  neonColors.orange,
  neonColors.purple,
  neonColors.lightBlue,
];

const neonBorderPalette = [
  neonColors.pinkBorder,
  neonColors.greenBorder,
  neonColors.blueBorder,
  neonColors.yellowBorder,
  neonColors.orangeBorder,
  neonColors.purpleBorder,
  neonColors.lightBlueBorder,
];

const categoryTrendColors = [
  { fill: neonColors.pink, border: neonColors.pinkBorder },
  { fill: neonColors.green, border: neonColors.greenBorder },
  { fill: neonColors.blue, border: neonColors.blueBorder },
  { fill: neonColors.yellow, border: neonColors.yellowBorder },
  { fill: neonColors.orange, border: neonColors.orangeBorder },
  { fill: neonColors.purple, border: neonColors.purpleBorder },
  { fill: neonColors.lightBlue, border: neonColors.lightBlueBorder },
];

// Common options shared across charts
const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: { color: "#E0E0E0", font: { size: 14 } },
    },
    tooltip: {
      enabled: true,
      backgroundColor: "rgba(10, 0, 20, 0.9)",
      titleColor: neonColors.purple,
      bodyColor: "#E0E0E0",
      borderColor: neonColors.purpleBorder,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 6,
      titleFont: { weight: "bold" as const, size: 14 },
      bodyFont: { size: 13 },
      boxPadding: 4,
    },
  },
  onHover: (event: ChartEvent, chartElements: ActiveElement[]) => {
    const target = event.native?.target as HTMLElement | null;
    if (target) {
      target.style.cursor = chartElements.length > 0 ? "pointer" : "default";
    }
  },
};

// Specific options for Bar charts
const barChartOptions = (
  titleText: string,
  isHorizontal: boolean = false
): ChartOptions<"bar"> => ({
  ...baseChartOptions,
  indexAxis: isHorizontal ? ("y" as const) : ("x" as const),
  interaction: {
    mode: isHorizontal ? ("y" as const) : ("index" as const),
    intersect: false,
  },
  plugins: {
    ...baseChartOptions.plugins,
    title: {
      display: true,
      text: titleText,
      color: "#FFFFFF",
      font: { size: 20, weight: "bold" as const },
      padding: { top: 10, bottom: 20 },
    },
    tooltip: {
      ...baseChartOptions.plugins.tooltip,
      callbacks: {
        label: (context: TooltipItem<"bar">) => {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          const value = isHorizontal ? context.parsed.x : context.parsed.y;
          if (value !== null && value !== undefined) {
            label +=
              new Intl.NumberFormat("en-US", {
                maximumFractionDigits: 0,
              }).format(value) + " lbs";
          }
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#A0A0A0", font: { size: 12 } },
      grid: { color: "rgba(255, 255, 255, 0.1)" },
    },
    y: {
      ticks: { color: "#A0A0A0", font: { size: 12 } },
      grid: { color: "rgba(255, 255, 255, 0.1)" },
    },
  },
});

// Specific options for Line charts
const lineChartOptions = (titleText: string): ChartOptions<"line"> => ({
  ...baseChartOptions,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  plugins: {
    ...baseChartOptions.plugins,
    title: {
      display: true,
      text: titleText,
      color: "#FFFFFF",
      font: { size: 20, weight: "bold" as const },
      padding: { top: 10, bottom: 20 },
    },
    tooltip: {
      ...baseChartOptions.plugins.tooltip,
      callbacks: {
        label: (context: TooltipItem<"line">) => {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          if (context.parsed.y !== null && context.parsed.y !== undefined) {
            label +=
              new Intl.NumberFormat("en-US", {
                maximumFractionDigits: 0,
              }).format(context.parsed.y) + " lbs";
          }
          return label;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#A0A0A0", font: { size: 12 } },
      grid: { color: "rgba(255, 255, 255, 0.1)" },
    },
    y: {
      ticks: { color: "#A0A0A0", font: { size: 12 } },
      grid: { color: "rgba(255, 255, 255, 0.1)" },
    },
  },
});

// Specific options for Pie charts
const pieChartOptions = (titleText: string): ChartOptions<"pie"> => ({
  ...baseChartOptions,
  interaction: {
    mode: "point" as const,
    intersect: true,
  },
  plugins: {
    ...baseChartOptions.plugins,
    title: {
      display: true,
      text: titleText,
      color: "#FFFFFF",
      font: { size: 20, weight: "bold" as const },
      padding: { top: 10, bottom: 20 },
    },
    tooltip: {
      ...baseChartOptions.plugins.tooltip,
      callbacks: {
        label: (context: TooltipItem<"pie">) => {
          let label = context.dataset.label || "";
          if (label) {
            label += ": ";
          }
          if (typeof context.raw === "number") {
            label +=
              new Intl.NumberFormat("en-US", {
                maximumFractionDigits: 0,
              }).format(context.raw) + " lbs";
          }
          return label;
        },
      },
    },
  },
});

export default function DashboardPage(): JSX.Element {
  const [chartData, setChartData] = useState<DashboardChartData>({
    categoryWeight: null,
    materialTypeDistribution: null,
    yearlyTrend: null,
    topVendors: null,
    categoryTrendsOverYears: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/cleaned_wastedata_final.csv");
        if (!response.ok) {
          throw new Error(
            `HTTP error! Status: ${response.status}. Unable to fetch cleaned_wastedata_final.csv.`
          );
        }
        const csvText = await response.text();

        Papa.parse<RawCsvRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<RawCsvRow>) => {
            const rawData = results.data;

            const processedData: ProcessedDataRow[] = rawData
              .map((row) => {
                const year = parseInt(row.Year, 10);
                const weight = parseFloat(
                  String(row["Weight (lbs)"]).replace(/,/g, "")
                );
                const cost = parseFloat(
                  String(row.Cost).replace(/[^0-9$.-]+/g, "")
                );
                if (isNaN(year) || isNaN(weight)) {
                  console.warn(
                    `Invalid row skipped: Year=${row.Year}, Weight=${row["Weight (lbs)"]}`
                  );
                  return null;
                }
                return {
                  Year: year,
                  Month: row.Month || "Unknown",
                  Day: row.Day || "Unknown",
                  Category: row.Category || "Unknown",
                  "Material Type": row["Material Type"] || "Unknown",
                  "Weight (lbs)": weight,
                  Vendor: row.Vendor || "unknown",
                  "Date Updated": row["Date Updated"] || "Unknown",
                  Cost: isNaN(cost) ? 0 : cost,
                  Notes: row.Notes || "Unknown",
                };
              })
              .filter((row): row is ProcessedDataRow => row !== null);

            if (processedData.length === 0) {
              console.warn(
                "No processable data found from cleaned_wastedata_final.csv."
              );
              setError("No processable data in CSV or data format incorrect.");
              setChartData({
                categoryWeight: null,
                materialTypeDistribution: null,
                yearlyTrend: null,
                topVendors: null,
                categoryTrendsOverYears: null,
              });
              setLoading(false);
              return;
            }

            // Aggregate data by year for yearly charts
            const yearlyAgg = processedData.reduce((acc, row) => {
              acc[row.Year] = (acc[row.Year] || 0) + row["Weight (lbs)"];
              return acc;
            }, {} as Record<number, number>);
            const sortedYears = Object.keys(yearlyAgg)
              .map(Number)
              .sort((a, b) => a - b);

            // 1. Total Weight by Category
            const categoryWeightAgg = processedData.reduce((acc, row) => {
              acc[row.Category] =
                (acc[row.Category] || 0) + row["Weight (lbs)"];
              return acc;
            }, {} as Record<string, number>);
            setChartData((prev) => ({
              ...prev,
              categoryWeight: {
                labels: Object.keys(categoryWeightAgg),
                datasets: [
                  {
                    label: "Total Weight (lbs)",
                    data: Object.values(categoryWeightAgg),
                    backgroundColor: neonColors.pink,
                    borderColor: neonColors.pinkBorder,
                    hoverBackgroundColor: neonColors.pinkHoverFill,
                    hoverBorderColor: neonColors.pinkHoverBorder,
                    borderWidth: 2,
                  },
                ],
              },
            }));

            // 2. Distribution of Material Types by Weight (Pie Chart)
            const materialTypeAgg = processedData.reduce((acc, row) => {
              const material = row["Material Type"] || "Unknown";
              acc[material] = (acc[material] || 0) + row["Weight (lbs)"];
              return acc;
            }, {} as Record<string, number>);
            setChartData((prev) => ({
              ...prev,
              materialTypeDistribution: {
                labels: Object.keys(materialTypeAgg),
                datasets: [
                  {
                    label: "Weight (lbs)",
                    data: Object.values(materialTypeAgg),
                    backgroundColor: neonPalette,
                    borderColor: neonBorderPalette,
                    borderWidth: 2,
                    hoverOffset: 15,
                    hoverBorderWidth: 3,
                    hoverBorderColor: "#FFFFFF",
                  },
                ],
              },
            }));

            // 3. Waste Weight Trend Over Years (Line Chart) - Total
            setChartData((prev) => ({
              ...prev,
              yearlyTrend: {
                labels: sortedYears.map(String),
                datasets: [
                  {
                    label: "Total Weight (lbs)",
                    data: sortedYears.map((year) => yearlyAgg[year]),
                    fill: false,
                    borderColor: neonColors.greenBorder,
                    backgroundColor: neonColors.green,
                    pointBorderColor: neonColors.greenBorder,
                    pointBackgroundColor: "#fff",
                    pointHoverBackgroundColor: neonColors.greenPointHoverFill,
                    pointHoverBorderColor: neonColors.greenPointHoverBorder,
                    tension: 0.2,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                  },
                ],
              },
            }));

            // 4. Top 10 Vendors by Waste Weight (Horizontal Bar Chart)
            const vendorAgg = processedData.reduce((acc, row) => {
              const vendor = row.Vendor;
              acc[vendor] = (acc[vendor] || 0) + row["Weight (lbs)"];
              return acc;
            }, {} as Record<string, number>);

            const filteredVendorEntries = Object.entries(vendorAgg).filter(
              ([name]) => {
                if (name === "unknown") {
                  return true;
                }
                return !/^[\$\d.,()-]+$/.test(name);
              }
            );

            const sortedVendors = filteredVendorEntries
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10);

            setChartData((prev) => ({
              ...prev,
              topVendors: {
                labels: sortedVendors.map((v) => v[0]),
                datasets: [
                  {
                    label: "Total Weight (lbs)",
                    data: sortedVendors.map((v) => v[1]),
                    backgroundColor: neonColors.blue,
                    borderColor: neonColors.blueBorder,
                    hoverBackgroundColor: neonColors.blueHoverFill,
                    hoverBorderColor: neonColors.blueHoverBorder,
                    borderWidth: 2,
                  },
                ],
              },
            }));

            // 5. Category Trends Over Years (Line Chart)
            const categories = [
              ...new Set(processedData.map((row) => row.Category)),
            ];
            const categoryYearlyData: Record<
              string,
              Record<number, number>
            > = {};
            categories.forEach((cat) => {
              categoryYearlyData[cat] = {};
            });

            processedData.forEach((row) => {
              categoryYearlyData[row.Category][row.Year] =
                (categoryYearlyData[row.Category][row.Year] || 0) +
                row["Weight (lbs)"];
            });

            const categoryTrendDatasets = categories.map((category, index) => {
              const colorIndex = index % categoryTrendColors.length;
              return {
                label: category,
                data: sortedYears.map(
                  (year) => categoryYearlyData[category][year] || 0
                ),
                borderColor: categoryTrendColors[colorIndex].border,
                backgroundColor: categoryTrendColors[colorIndex].fill, // For points
                pointBorderColor: categoryTrendColors[colorIndex].border,
                pointBackgroundColor: "#fff",
                pointHoverBackgroundColor:
                  categoryTrendColors[colorIndex].border,
                pointHoverBorderColor: "#fff",
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
              };
            });

            setChartData((prev) => ({
              ...prev,
              categoryTrendsOverYears: {
                labels: sortedYears.map(String),
                datasets: categoryTrendDatasets,
              },
            }));

            setLoading(false);
          },
          error: (err: Error) => {
            console.error("PapaParse Error:", err);
            setError(`Failed to parse CSV data: ${err.message}`);
            setLoading(false);
          },
        });
      } catch (err) {
        console.error("Fetch Data Error:", err);
        setError(
          `Failed to fetch CSV data. Error: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-indigo-950 to-purple-900 text-white p-4">
        Loading dashboard data...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-indigo-950 to-purple-900 text-red-400 p-4">
        <h2 className="text-2xl mb-4">Error</h2>
        <p>{error}</p>
      </div>
    );

  return (
    <>
      <Head>
        <title>Waste Data Dashboard - Vamsikrishna Nouluri</title>
        <meta
          name="description"
          content="Interactive data visualization dashboard for waste data."
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-black via-indigo-950 to-purple-900 text-gray-200 p-4 md:p-8">
        <header className="text-center py-6 md:py-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Vamsikrishna Nouluri
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-300 mt-1">
            Data Visualization
          </p>
        </header>

        <div className="text-center mb-8 px-4 max-w-3xl mx-auto">
          <p className="text-lg text-purple-300">
            Welcome to the Waste Data Dashboard! The charts below are
            interactive. Hover over data points for specific values and click on
            items in the legend to toggle their visibility in the chart.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-black bg-opacity-70 p-4 md:p-6 rounded-xl shadow-2xl shadow-purple-500/30 chart-container">
            {chartData.categoryWeight &&
            chartData.categoryWeight.labels?.length ? (
              <Bar
                options={barChartOptions("Total Weight by Category")}
                data={chartData.categoryWeight}
              />
            ) : (
              <p className="flex items-center justify-center h-full text-gray-400">
                Loading Category Weight...
              </p>
            )}
          </div>

          <div className="bg-black bg-opacity-70 p-4 md:p-6 rounded-xl shadow-2xl shadow-pink-500/30 chart-container">
            {chartData.materialTypeDistribution &&
            chartData.materialTypeDistribution.labels?.length ? (
              <Pie
                options={pieChartOptions("Material Type Distribution")}
                data={chartData.materialTypeDistribution}
              />
            ) : (
              <p className="flex items-center justify-center h-full text-gray-400">
                Loading Material Type Distribution...
              </p>
            )}
          </div>

          <div className="bg-black bg-opacity-70 p-4 md:p-6 rounded-xl shadow-2xl shadow-green-500/30 chart-container">
            {chartData.yearlyTrend && chartData.yearlyTrend.labels?.length ? (
              <Line
                options={lineChartOptions(
                  "Total Waste Weight Trend Over Years"
                )}
                data={chartData.yearlyTrend}
              />
            ) : (
              <p className="flex items-center justify-center h-full text-gray-400">
                Loading Yearly Trend...
              </p>
            )}
          </div>

          <div className="bg-black bg-opacity-70 p-4 md:p-6 rounded-xl shadow-2xl shadow-blue-500/30 chart-container">
            {chartData.topVendors && chartData.topVendors.labels?.length ? (
              <Bar
                options={barChartOptions("Top 10 Vendors by Weight", true)}
                data={chartData.topVendors}
              />
            ) : (
              <p className="flex items-center justify-center h-full text-gray-400">
                Loading Top Vendors...
              </p>
            )}
          </div>

          <div className="bg-black bg-opacity-70 p-4 md:p-6 rounded-xl shadow-2xl shadow-yellow-500/30 chart-container lg:col-span-2">
            {chartData.categoryTrendsOverYears &&
            chartData.categoryTrendsOverYears.labels?.length ? (
              <Line
                options={lineChartOptions(
                  "Waste Category Trends Over Years (lbs)"
                )}
                data={chartData.categoryTrendsOverYears}
              />
            ) : (
              <p className="flex items-center justify-center h-full text-gray-400">
                Loading Category Trends...
              </p>
            )}
          </div>
        </div>

        <section className="mt-12 md:mt-16 max-w-5xl mx-auto p-6 bg-black bg-opacity-60 rounded-lg shadow-xl text-gray-300">
          <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">
            About the Dashboard: Unveiling the Waste Story
          </h2>
          <div className="space-y-8 text-lg leading-relaxed">
            <div>
              <h3 className="text-2xl font-semibold text-pink-400 mb-3">
                The Story in the Data
              </h3>
              <p>
                This dashboard visualizes waste management data, offering
                insights into disposal patterns. Key observations include:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 pl-4">
                <li>
                  The{" "}
                  <strong className="text-pink-400">
                    &quot;Total Weight by Category&quot;
                  </strong>{" "}
                  chart highlights which waste categories (e.g., recycle,
                  landfill, compost, reuse) contribute most to the overall waste
                  volume. This helps identify primary areas for waste reduction
                  efforts.
                </li>
                <li>
                  The{" "}
                  <strong className="text-pink-400">
                    &quot;Material Type Distribution&quot;
                  </strong>{" "}
                  pie chart breaks down the composition of waste, showing the
                  proportion of different material types. This is crucial for
                  understanding recycling effectiveness and potential for
                  improving material recovery.
                </li>
                <li>
                  The{" "}
                  <strong className="text-green-400">
                    &quot;Total Waste Weight Trend Over Years&quot;
                  </strong>{" "}
                  line chart tracks the total amount of waste generated over
                  time. This reveals long-term trends, such as whether waste
                  generation is increasing, decreasing, or remaining stable.
                </li>
                <li>
                  The{" "}
                  <strong className="text-yellow-400">
                    &quot;Waste Category Trends Over Years&quot;
                  </strong>{" "}
                  chart provides a deeper dive, showing how the volume of each
                  specific waste category (recycle, landfill, etc.) has changed
                  year by year. This allows for comparing category-specific
                  trends and identifying if efforts to reduce one category are
                  impacting others.
                </li>
                <li>
                  The{" "}
                  <strong className="text-blue-400">
                    &quot;Top 10 Vendors by Weight&quot;
                  </strong>{" "}
                  chart (after filtering out numerical/non-name entries)
                  identifies the primary service providers handling the waste.
                  This can be useful for contract management and assessing
                  vendor performance or reliance.
                </li>
              </ul>
              <p className="mt-3">
                By exploring these visualizations, we can better understand the
                campus&apos;s waste footprint, identify areas for improvement,
                and track progress towards sustainability goals.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-pink-400 mb-3">
                Design Rationale & Effectiveness
              </h3>
              <p>
                The design of this dashboard aims to deliver these insights
                clearly and engagingly:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-3 pl-4">
                <li>
                  <strong className="text-purple-300">
                    Visualization Choices:
                  </strong>
                  <ul className="list-circle list-inside ml-4 mt-1 space-y-1 text-gray-400">
                    <li>
                      <strong className="text-gray-200">Bar Charts</strong>{" "}
                      (Category Weight, Top Vendors): Chosen for their
                      effectiveness in comparing the magnitude of discrete
                      categories. The horizontal orientation for &quot;Top
                      Vendors&quot; improves readability of longer vendor names.
                    </li>
                    <li>
                      <strong className="text-gray-200">Pie Chart</strong>{" "}
                      (Material Type Distribution): Ideal for illustrating
                      part-to-whole relationships, clearly showing the
                      proportional contribution of each material type to the
                      total.
                    </li>
                    <li>
                      <strong className="text-gray-200">Line Charts</strong>{" "}
                      (Total Yearly Trend, Category Trends Over Years): Best
                      suited for displaying trends over a continuous variable
                      like time. The multi-line chart for category trends allows
                      for direct comparison of how different waste streams
                      evolve over the years.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong className="text-purple-300">Color Scheme:</strong> The
                  dashboard employs a{" "}
                  <strong className="text-gray-200">
                    dark theme with a black gradient purple page background
                  </strong>{" "}
                  and{" "}
                  <strong className="text-gray-200">
                    black backgrounds for graph containers
                  </strong>
                  . This creates a modern, focused environment.{" "}
                  <strong className="text-gray-200">Neon colors</strong> (pinks,
                  greens, blues, yellows, etc.) are used for plot points, lines,
                  and bars. This high contrast makes the data elements
                  &quot;pop&quot; against the dark backdrop, enhancing
                  visibility and drawing attention to key information. Distinct
                  colors are assigned to each category in the &quot;Category
                  Trends&quot; chart for easy differentiation.
                </li>
                <li>
                  <strong className="text-purple-300">Interactivity:</strong>{" "}
                  Charts are interactive to encourage exploration:
                  <ul className="list-circle list-inside ml-4 mt-1 space-y-1 text-gray-400">
                    <li>
                      <strong className="text-gray-200">Tooltips:</strong>{" "}
                      Hovering over any data point or bar reveals a tooltip with
                      precise values, allowing for detailed data inspection.
                      Tooltips are styled to match the dark theme.
                    </li>
                    <li>
                      <strong className="text-gray-200">
                        Legend Toggling:
                      </strong>{" "}
                      Clicking on items in a chart&apos;s legend allows users to
                      show or hide specific datasets, enabling focused
                      comparisons.
                    </li>
                    <li>
                      <strong className="text-gray-200">Hover Effects:</strong>{" "}
                      Data elements (bars, pie slices, line points) change
                      appearance on hover (e.g., brighter color, increased size,
                      or an offset for pie slices), providing clear visual
                      feedback and enhancing the sense of direct manipulation.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong className="text-purple-300">Size & Layout:</strong>{" "}
                  Charts are presented in a responsive grid layout. The
                  &quot;Category Trends Over Years&quot; chart is given a
                  full-width span on larger screens (lg:col-span-2) to
                  accommodate multiple lines and ensure readability. The
                  `chart-container` class helps maintain a consistent and
                  adequate height for each chart.
                </li>
                <li>
                  <strong className="text-purple-300">Readability:</strong> Text
                  elements, including titles, labels, and the descriptive text
                  you&apos;re reading now, use light colors (#FFFFFF, #E0E0E0,
                  #A0A0A0) for high contrast against the dark backgrounds,
                  ensuring good legibility. Font sizes are chosen to be clear
                  and hierarchical.
                </li>
              </ul>
              <p className="mt-3">
                These design decisions work in concert to make the data not only
                accessible but also engaging, allowing users to quickly grasp
                key trends and delve into specifics through interactive
                elements. The thematic consistency of the dark neon design
                provides a visually appealing and professional presentation of
                the waste data story.
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center py-10 mt-10 text-gray-500">
          <p>
            © {new Date().getFullYear()} Vamsikrishna Nouluri. All rights
            reserved.
          </p>
          <p>Waste Data Visualization Project</p>
        </footer>
      </main>
    </>
  );
}
