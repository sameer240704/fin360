"use client";

import React, { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  UploadCloud,
  Download,
  FileText,
  CheckCircle,
  TrendingUp,
  PieChart,
  AlertTriangle,
  ChevronRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AI_SERVER_URL } from "@/constants/utils";

const API_ROUTES = {
  sentiment: `${AI_SERVER_URL}/analyze/sentiment_analysis`,
  business: `${AI_SERVER_URL}/analyze/business_model`,
  anomaly: `${AI_SERVER_URL}/analyze/anomaly-detection`,
};

const AnalysisPage = () => {
  const [files, setFiles] = useState({
    sentiment: null,
    business: null,
    anomaly: null,
  });
  const [results, setResults] = useState({
    sentiment: null,
    business: null,
    anomaly: null,
  });
  const [progress, setProgress] = useState({
    sentiment: 0,
    business: 0,
    anomaly: 0,
  });
  const [loading, setLoading] = useState({
    sentiment: false,
    business: false,
    anomaly: false,
  });
  const fileInputRefs = {
    sentiment: useRef(null),
    business: useRef(null),
    anomaly: useRef(null),
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add(
      "ring-2",
      "ring-primary-500",
      "dark:ring-dark-primary"
    );
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove(
      "ring-2",
      "ring-primary-500",
      "dark:ring-dark-primary"
    );
  };

  const handleDrop = (type, e) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      "ring-2",
      "ring-primary-500",
      "dark:ring-dark-primary"
    );

    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setFiles((prev) => ({ ...prev, [type]: file }));
    } else {
      alert("Please upload a PDF file");
    }
  };

  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setFiles((prev) => ({ ...prev, [type]: file }));
    } else {
      alert("Please upload a PDF file");
    }
  };

  const simulateProgress = (type) => {
    let progressVal = 0;
    const interval = setInterval(() => {
      progressVal += Math.random() * 15;
      if (progressVal > 95) {
        progressVal = 95;
        clearInterval(interval);
      }
      setProgress((prev) => ({ ...prev, [type]: progressVal }));
    }, 500);

    return () => clearInterval(interval);
  };

  const handleSubmit = async (type) => {
    if (!files[type]) return;

    setLoading((prev) => ({ ...prev, [type]: true }));
    setProgress((prev) => ({ ...prev, [type]: 0 }));

    const stopProgress = simulateProgress(type);

    const formData = new FormData();
    formData.append("file", files[type]);

    try {
      const response = await fetch(API_ROUTES[type], {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Store the download URL from the response
        setResults((prev) => ({ ...prev, [type]: data }));
        setProgress((prev) => ({ ...prev, [type]: 100 }));
      } else {
        alert(`Error in ${type} analysis: ${response.statusText}`);
        setProgress((prev) => ({ ...prev, [type]: 0 }));
      }
    } catch (error) {
      console.error(`Error during ${type} analysis:`, error);
      alert(`Failed to connect to ${type} analysis server`);
      setProgress((prev) => ({ ...prev, [type]: 0 }));
    } finally {
      stopProgress();
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDownload = (type) => {
    if (!results[type] || !results[type].download_url) return;

    // Create full URL by combining server URL with the download path
    const downloadUrl = `${AI_SERVER_URL}${results[type].download_url}`;

    window.open(downloadUrl, "_blank");
  };

  const handlePreview = (type) => {
    if (!results[type] || !results[type].download_url) return;

    // Create full URL by combining server URL with the download path
    const previewUrl = `${AI_SERVER_URL}${results[type].download_url}`;

    window.open(previewUrl, "_blank");
  };

  const AnalysisComponent = ({ type, title, description, icon, features }) => {
    const Icon = icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full bg-secondary dark:bg-dark-secondary-100 shadow-lg border-0 rounded-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-300 to-primary-500 dark:from-dark-primary-300 dark:to-dark-primary" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-dark-primary-100 p-3 rounded-full">
                  <Icon className="h-6 w-6 text-primary dark:text-dark-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">{title}</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2 text-base">
              {description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div
              className="border-2 border-dashed border-primary-200 dark:border-dark-primary-200 rounded-xl p-8 text-center transition-all duration-200 hover:border-primary-400 dark:hover:border-dark-primary-400 relative group"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(type, e)}
            >
              <input
                type="file"
                ref={fileInputRefs[type]}
                accept=".pdf"
                onChange={(e) => handleFileChange(type, e)}
                className="hidden"
              />

              {!files[type] ? (
                <div className="space-y-3">
                  <div className="mx-auto bg-primary-50 dark:bg-dark-primary-900/20 rounded-full w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="h-10 w-10 text-primary-500 dark:text-dark-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      Drop your PDF here or
                    </p>
                    <Button
                      variant="link"
                      className="text-primary dark:text-dark-primary font-medium"
                      onClick={() => fileInputRefs[type].current.click()}
                    >
                      click to browse
                    </Button>
                    <p className="text-sm text-secondary-700 dark:text-dark-secondary-800">
                      Only PDF files are supported
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto bg-primary-100 dark:bg-dark-primary-900/30 rounded-full w-16 h-16 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary-500 dark:text-dark-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-base truncate max-w-xs mx-auto">
                      {files[type].name}
                    </p>
                    <p className="text-sm text-secondary-700 dark:text-dark-secondary-800">
                      {(files[type].size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="link"
                    className="text-primary-600 dark:text-dark-primary-400 font-medium text-sm"
                    onClick={() =>
                      setFiles((prev) => ({ ...prev, [type]: null }))
                    }
                  >
                    Remove file
                  </Button>
                </div>
              )}
            </div>

            {files[type] && !results[type] && (
              <div className="space-y-4">
                {loading[type] && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary-800 dark:text-dark-secondary-700">
                        Analyzing document...
                      </span>
                      <span className="font-medium">
                        {Math.round(progress[type])}%
                      </span>
                    </div>
                    <Progress
                      value={progress[type]}
                      className="h-2 bg-secondary-300 dark:bg-dark-secondary-300"
                    />
                  </div>
                )}

                <Button
                  className="w-full bg-primary hover:bg-primary-600 dark:bg-dark-primary dark:hover:bg-dark-primary-600 font-medium py-6 text-base transition-all shadow-md hover:shadow-lg"
                  onClick={() => handleSubmit(type)}
                  disabled={loading[type]}
                >
                  {loading[type] ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Analyze Document</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </div>
            )}

            {results[type] && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-400">
                          Analysis Complete
                        </h4>
                        <p className="text-sm text-green-700/80 dark:text-green-500/80 mt-0.5">
                          Your results are ready
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2">
                    <Button
                      onClick={() => handlePreview(type)}
                      variant="outline"
                      className="border-green-300 dark:border-green-700 bg-white dark:bg-dark-secondary-100 hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Preview PDF
                    </Button>

                    <Button
                      onClick={() => handleDownload(type)}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" /> Download PDF
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="bg-transparent transition-colors overflow-y-scroll">
      <div className="mx-auto pb-16 max-sm:px-8">
        <div className="flex flex-col gap-12">
          <Tabs defaultValue="sentiment" className="w-full">
            <TabsList className="w-full h-14 max-w-7xl mx-auto bg-white dark:bg-dark-secondary-200 p-1.5 rounded-full shadow-md mb-8 border border-secondary-200 dark:border-dark-secondary-300 grid grid-cols-4">
              <TabsTrigger
                value="sentiment"
                className="rounded-full py-2.5 data-[state=active]:bg-primary-500 data-[state=active]:text-white dark:data-[state=active]:bg-dark-primary dark:data-[state=active]:text-dark-secondary-100 transition-all"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Sentiment Analysis
              </TabsTrigger>
              <TabsTrigger
                value="business"
                className="rounded-full py-2.5 data-[state=active]:bg-primary-500 data-[state=active]:text-white dark:data-[state=active]:bg-dark-primary dark:data-[state=active]:text-dark-secondary-100 transition-all"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Business Model
              </TabsTrigger>
              <TabsTrigger
                value="anomaly"
                className="rounded-full py-2.5 data-[state=active]:bg-primary-500 data-[state=active]:text-white dark:data-[state=active]:bg-dark-primary dark:data-[state=active]:text-dark-secondary-100 transition-all"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anomaly Detection
              </TabsTrigger>
              <TabsTrigger
                value="comparitive"
                className="rounded-full py-2.5 data-[state=active]:bg-primary-500 data-[state=active]:text-white dark:data-[state=active]:bg-dark-primary dark:data-[state=active]:text-dark-secondary-100 transition-all"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Comparitive Analysis
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="sentiment">
                <AnalysisComponent
                  type="sentiment"
                  title="Sentiment Analysis"
                  description="Upload a document to analyze sentiment, emotion, and subjective content within your text."
                  icon={TrendingUp}
                  features={[
                    "Emotional tone detection",
                    "Subjective language analysis",
                    "Key topic identification",
                    "Market sentiment summary",
                  ]}
                />
              </TabsContent>

              <TabsContent value="business">
                <div className="h-[calc(100vh-2rem)] pr-3">
                  <div className="bg-white dark:bg-dark-secondary-500 rounded-2xl shadow-xl h-full flex flex-col">
                    <div className="flex-1 relative">
                      <iframe
                        src="https://buddhadevyash-d2kaiml-business-ixcx4v.streamlit.app/?embed=true"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Business Modal"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="anomaly">
                <div className="h-[calc(100vh-2rem)] pr-3">
                  <div className="bg-white dark:bg-dark-secondary-500 rounded-2xl shadow-xl h-full flex flex-col">
                    <div className="flex-1 relative">
                      <iframe
                        src="https://anamolydetectionfinance.streamlit.app/?embed=true"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Business Modal"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comparitive">
                <div className="h-[calc(100vh-2rem)] pr-3">
                  <div className="bg-white dark:bg-dark-secondary-500 rounded-2xl shadow-xl h-full flex flex-col">
                    <div className="flex-1 relative">
                      <iframe
                        src="https://comparitiveanalysis.streamlit.app/?embed=true"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Business Modal"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
