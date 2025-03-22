"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Plus, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AI_SERVER_URL } from "@/constants/utils";

const FALLBACK_ASSETS = [
  {
    id: 1,
    name: "HDFC Bank",
    currentValue: 1640,
    expectedReturn: 12,
    quantity: 10,
  },
  {
    id: 2,
    name: "Reliance Industries",
    currentValue: 2450,
    expectedReturn: 10,
    quantity: 5,
  },
  {
    id: 3,
    name: "Infosys",
    currentValue: 1320,
    expectedReturn: 15,
    quantity: 15,
  },
  { id: 4, name: "TCS", currentValue: 3280, expectedReturn: 8, quantity: 3 },
];

const FALLBACK_IMAGES = [
  "https://blogs.sas.com/content/graphicallyspeaking/files/2017/09/Stock_Plot_Discrete_Group.png",
];

const CalculatorCard = ({ title, children }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
      {title}
    </h3>
    {children}
  </div>
);

const formatRupees = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

const ErrorBanner = ({ message, onRetry }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-red-500" />
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
          Data Loading Error
        </h3>
        <div className="mt-2 text-sm text-red-700 dark:text-red-400">
          <p>{message || "Failed to load data. Using sample data instead."}</p>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  </div>
);

const AssetGrowthCalculator = () => {
  const [timeframe, setTimeframe] = useState(1);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePaths, setImagePaths] = useState([]);
  const [newAsset, setNewAsset] = useState({
    name: "",
    currentValue: 0,
    expectedReturn: 0,
    quantity: 0,
  });
  const [usingSampleData, setUsingSampleData] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setUsingSampleData(false);

    try {
      await fetchStockData();
      await fetchProphetImages();
    } catch (err) {
      console.error("Failed to load complete data:", err);
      setError(err.message || "Failed to load data");

      setAssets(FALLBACK_ASSETS);
      setImagePaths([FALLBACK_IMAGES[0]]);
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockData = async () => {
    try {
      const response = await fetch(`${AI_SERVER_URL}/portfolio_data`);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);
      const stocksData = data.stocks;

      const mappedAssets = stocksData.map((stock, index) => ({
        id: index + 1,
        name: stock.stockName,
        currentValue: stock.currentPrice,
        expectedReturn: 10,
        quantity: stock.numberOfShares,
      }));

      setAssets(mappedAssets);
    } catch (err) {
      console.error("Error fetching stocks:", err);
      throw err;
    }
  };

  const fetchProphetImages = async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch(`${AI_SERVER_URL}/prophet_stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ years: timeframe }),
      });

      if (!response.ok) {
        throw new Error(`Prophet API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.prophet_images && data.prophet_images.length > 0) {
        setImagePaths(data.prophet_images);
      } else {
        throw new Error("No image data received");
      }
    } catch (err) {
      console.error("Error fetching prophet images:", err);
      throw err;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!usingSampleData && !loading && assets.length > 0) {
      fetchProphetImages().catch((err) => {
        console.error("Failed to update projections:", err);
        toast.error(
          "Failed to update projections. Using sample image instead."
        );
        setImagePaths([FALLBACK_IMAGES[0]]);
      });
    }
  }, [timeframe]);

  const calculateFutureValue = (currentValue, expectedReturn, years) => {
    const annualRate = expectedReturn / 100;
    return currentValue * Math.pow(1 + annualRate, years);
  };

  const addAsset = () => {
    if (
      newAsset.name &&
      newAsset.currentValue > 0 &&
      newAsset.expectedReturn > 0 &&
      newAsset.quantity > 0
    ) {
      setAssets([
        ...assets,
        {
          id: Date.now(), // Use timestamp for unique ID
          name: newAsset.name,
          currentValue: parseFloat(newAsset.currentValue),
          expectedReturn: parseFloat(newAsset.expectedReturn),
          quantity: parseInt(newAsset.quantity),
        },
      ]);
      setNewAsset({
        name: "",
        currentValue: 0,
        expectedReturn: 0,
        quantity: 0,
      });
      toast.success("Asset added successfully");
    } else {
      toast.error("Please fill all fields with valid values");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-96 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Loading your assets...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-sm:px-6 max-lg:px-8 py-2 overflow-y-scroll pr-2">
      {usingSampleData && (
        <ErrorBanner
          message="Could not load your portfolio data. Using sample data instead."
          onRetry={fetchData}
        />
      )}

      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-4">
              <label className="text-base font-medium text-gray-700 dark:text-gray-300">
                Projection Timeframe
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTimeframe(Math.max(0, timeframe - 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <span className="font-bold">-</span>
                </button>
                <span className="text-sm font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 px-4 py-1.5 rounded-full min-w-[80px] text-center">
                  {timeframe} year{timeframe !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setTimeframe(Math.min(5, timeframe + 1))}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                >
                  <span className="font-bold">+</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-2 left-0 w-full">
                <div className="relative">
                  {[0, 25, 50, 75, 100].map((mark) => (
                    <div
                      key={mark}
                      className="absolute top-0 w-px h-2 bg-gray-300 dark:bg-gray-600"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
                className="w-full h-2 appearance-none cursor-pointer bg-transparent focus:outline-none"
                style={{
                  WebkitAppearance: "none",
                  background: `linear-gradient(to right, rgb(76, 215, 151) ${
                    (timeframe / 5) * 100
                  }%, rgb(229, 231, 235) ${(timeframe / 5) * 100}%)`,
                  borderRadius: "9999px",
                }}
              />
              <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  background: #fff;
                  border: 2px solid rgb(76, 215, 151);
                  border-radius: 50%;
                  cursor: pointer;
                  transition: all 0.15s ease-in-out;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                }
                input[type="range"]::-webkit-slider-thumb:active {
                  transform: scale(0.9);
                  background: rgb(76, 215, 151);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  background: #fff;
                  border: 2px solid rgb(76, 215, 151);
                  border-radius: 50%;
                  cursor: pointer;
                  transition: all 0.15s ease-in-out;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                input[type="range"]::-moz-range-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                }
                input[type="range"]::-moz-range-thumb:active {
                  transform: scale(0.9);
                  background: rgb(76, 215, 151);
                }
              `}</style>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
              {[0, 1, 2, 3, 4, 5].map((year) => (
                <button
                  key={year}
                  onClick={() => setTimeframe(year)}
                  className={`px-2 py-1 rounded transition-colors ${
                    timeframe === year
                      ? "text-primary-600 dark:text-primary-400 font-semibold"
                      : "hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {year} {year === 1 ? "year" : "years"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium min-w-[160px] hover:shadow-lg active:transform active:scale-95"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Asset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CalculatorCard title="Your Assets">
          {assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No assets found. Click "Add Asset" to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Value (₹)
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expected Return (%)
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Future Value ({timeframe} year{timeframe !== 1 ? "s" : ""}
                      )
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {assets.map((asset) => {
                    const futureValue = calculateFutureValue(
                      asset.currentValue * asset.quantity,
                      asset.expectedReturn,
                      timeframe
                    );
                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {asset.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {asset.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatRupees(asset.currentValue * asset.quantity)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {asset.expectedReturn}%
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400">
                          {formatRupees(futureValue)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-primary-50 dark:bg-primary-900/20 font-medium">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      Total Portfolio
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      {formatRupees(
                        assets.reduce(
                          (sum, asset) =>
                            sum + asset.currentValue * asset.quantity,
                          0
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      -
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-primary-600 dark:text-primary-400">
                      {formatRupees(
                        assets.reduce(
                          (sum, asset) =>
                            sum +
                            calculateFutureValue(
                              asset.currentValue * asset.quantity,
                              asset.expectedReturn,
                              timeframe
                            ),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CalculatorCard>

        <CalculatorCard title="Portfolio Growth Projection">
          <div className="h-[400px] relative">
            {isGeneratingReport ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Generating projections...
                  </p>
                </div>
              </div>
            ) : imagePaths.length > 0 ? (
              <div className="h-full flex items-center justify-center">
                {imagePaths.map((imagePath, index) => (
                  <div
                    key={index}
                    className="h-full flex items-center justify-center"
                  >
                    {imagePath.startsWith("http") ? (
                      <img
                        src={imagePath}
                        alt={`Stock Prediction ${index}`}
                        className="max-h-96 max-w-full object-contain"
                      />
                    ) : (
                      <img
                        src={`data:image/png;base64,${imagePath}`}
                        alt={`Stock Prediction ${index}`}
                        className="max-h-96 max-w-full object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No projection data available
                </p>
              </div>
            )}
          </div>
        </CalculatorCard>
      </div>

      {/* Add New Asset Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Add New Asset
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asset Name
            </label>
            <input
              type="text"
              value={newAsset.name}
              onChange={(e) =>
                setNewAsset({ ...newAsset, name: e.target.value })
              }
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter asset name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={newAsset.quantity || ""}
              onChange={(e) =>
                setNewAsset({ ...newAsset, quantity: Number(e.target.value) })
              }
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter quantity"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Value (₹)
            </label>
            <input
              type="number"
              value={newAsset.currentValue || ""}
              onChange={(e) =>
                setNewAsset({
                  ...newAsset,
                  currentValue: Number(e.target.value),
                })
              }
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter current value"
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected Annual Return (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={newAsset.expectedReturn || ""}
                onChange={(e) =>
                  setNewAsset({
                    ...newAsset,
                    expectedReturn: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter expected return"
                min="0"
                max="100"
                step="0.1"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            addAsset();
            setIsModalOpen(false);
          }}
          className="mt-6 w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          Add Asset
        </button>
      </Modal>
    </div>
  );
};

export default AssetGrowthCalculator;
