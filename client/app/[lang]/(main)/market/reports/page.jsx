"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "next-themes";
import {
  PlusCircle,
  FileText,
  Upload,
  Search,
  Check,
  X,
  Share2,
  Download,
  MessageSquare,
  History,
  Filter,
  Trash2,
  BookOpen,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { AI_SERVER_URL } from "@/constants/utils";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const ReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [zoomLevel, setZoomLevel] = useState(160);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const pdfContainerRef = useRef(null);
  const { theme } = useTheme();

  const filteredReports = reports
    .filter(
      (report) =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterTag === "all" || report.tags.includes(filterTag))
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  const analyzeSelection = async () => {
    if (!selectedArea) return;

    setAiAnalysis({ loading: true });

    setTimeout(() => {
      setAiAnalysis({
        loading: false,
        result:
          "Based on the financial data in this section, there's a 15% increase in quarterly revenue compared to the previous year. The growth appears to be driven by new product lines and expansion into emerging markets. Consider allocating more resources to these growth areas in the next fiscal year.",
        timestamp: new Date().toISOString(),
      });
    }, 1500);

    setIsSelecting(false);
    setSelectedArea(null);
  };

  const startSelection = () => {
    setIsSelecting(true);
    setSelectedArea(null);
    setAiAnalysis(null);
  };

  const handleMouseDown = (e) => {
    if (!isSelecting) return;

    const container = pdfContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectedArea({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });

    const handleMouseMove = (moveEvent) => {
      const endX = moveEvent.clientX - rect.left;
      const endY = moveEvent.clientY - rect.top;

      setSelectedArea((prev) => ({
        ...prev,
        endX,
        endY,
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const { startX, startY, endX, endY } = selectedArea;
      if (Math.abs(endX - startX) < 10 || Math.abs(endY - startY) < 10) {
        setSelectedArea(null);
        return;
      }

      analyzeSelection();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const startAnnotating = () => {
    setIsAnnotating(true);
    setCurrentAnnotation(null);
  };

  const handleAnnotationClick = (e) => {
    if (!isAnnotating) return;

    const container = pdfContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnnotation = {
      id: Date.now(),
      x,
      y,
      text: "Note: Important information here",
      color: theme === "dark" ? "#f43f5e" : "#ef4444",
      timestamp: new Date().toISOString(),
    };

    setAnnotations([...annotations, newAnnotation]);
    setIsAnnotating(false);
  };

  const selectReport = (report) => {
    setSelectedReport(report);
    setAnnotations([]);
    setAiAnalysis(null);
    setActiveTab("view");
  };

  const addComment = () => {
    if (!commentText.trim() || !selectedReport) return;

    const newComment = {
      id: Date.now(),
      author: "You",
      text: commentText,
      date: new Date().toISOString(),
    };

    const updatedReports = reports.map((report) =>
      report.id === selectedReport.id
        ? { ...report, comments: [...report.comments, newComment] }
        : report
    );

    setReports(updatedReports);
    setSelectedReport({
      ...selectedReport,
      comments: [...selectedReport.comments, newComment],
    });
    setCommentText("");
  };

  const deleteReport = (reportId) => {
    const updatedReports = reports.filter((report) => report.id !== reportId);
    setReports(updatedReports);
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport(null);
    }
  };

  const getSelectionStyle = () => {
    if (!selectedArea) return null;

    const { startX, startY, endX, endY } = selectedArea;
    return {
      left: Math.min(startX, endX) + "px",
      top: Math.min(startY, endY) + "px",
      width: Math.abs(endX - startX) + "px",
      height: Math.abs(endY - startY) + "px",
      position: "absolute",
      border: "2px dashed #f43f5e",
      backgroundColor: "rgba(244, 63, 94, 0.2)",
      pointerEvents: "none",
      zIndex: 10,
    };
  };

  const saveAnalysisAsAnnotation = () => {
    if (!aiAnalysis || aiAnalysis.loading) return;

    const container = pdfContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = rect.width / 2;
    const y = rect.height / 2;

    const newAnnotation = {
      id: Date.now(),
      x,
      y,
      text: `AI Analysis: ${aiAnalysis.result}`,
      color: theme === "dark" ? "#3b82f6" : "#2563eb",
      timestamp: new Date().toISOString(),
      isAiGenerated: true,
    };

    setAnnotations([...annotations, newAnnotation]);
    setAiAnalysis(null);
  };

  const exportReport = async () => {
    if (!selectedReport) return;

    try {
      const file_hash = selectedReport.file_hash;
      const response = await fetch(
        `${AI_SERVER_URL}/download/pdf/${file_hash}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download the report.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "financial_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download the report.");
    }
  };

  const shareReport = () => {
    alert("Report share link generated and copied to clipboard!");
  };

  const UploadDialog = () => {
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState("");
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [pagesToProcess, setPagesToProcess] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    const handleFileChange = async (e) => {
      const selectedFile = e.target.files[0];
      if (!selectedFile) return;

      setFile(selectedFile);

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();

        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        setTotalPages(numPages);

        const allPages = Array.from({ length: numPages }, (_, i) => i);
        setPagesToProcess(allPages);
      } catch (error) {
        console.error("Error reading PDF:", error);
        toast.error("Error reading PDF file. Please try again.");
      }
    };

    const handleUpload = async () => {
      if (!file || !title) {
        toast.error("Please fill in all fields and select a file.");
        return;
      }

      setIsLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages_to_process", JSON.stringify(pagesToProcess));

      try {
        const response = await fetch(`${AI_SERVER_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload and analyze the file.");
        }

        const result = await response.json();

        const newReport = {
          id: Date.now(),
          title: title,
          date: new Date().toISOString(),
          author: "You",
          tags: tags.split(",").map((tag) => tag.trim()),
          comments: [],
          versions: [
            {
              id: 1,
              date: new Date().toISOString(),
              author: "You",
              notes: "Initial version",
            },
          ],
          analysisResult: result?.data?.analysis_result,
          extractedText: result?.data?.extracted_text,
          file_hash: result?.data?.file_hash,
        };

        setReports((prevReports) => [newReport, ...prevReports]);
        setSelectedReport(newReport);
        setIsUploading(false);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Error uploading file. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handlePageSelection = (pageNumber, isSelected) => {
      setPagesToProcess((prev) => {
        if (isSelected) {
          return [...prev, pageNumber];
        } else {
          return prev.filter((p) => p !== pageNumber);
        }
      });
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full mt-4 bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> New Report
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload New Report</DialogTitle>
            <DialogDescription>
              Upload a PDF document to generate a new report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="report-title">Report Title</Label>
              <Input
                id="report-title"
                placeholder="Enter report title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-file">PDF Document</Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports PDF files up to 10MB
                </p>
                <Input
                  id="report-file"
                  type="file"
                  accept=".pdf"
                  className="mt-4"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {totalPages > 0 && (
              <div className="grid gap-2">
                <Label>
                  Select Pages to Process ({pagesToProcess.length} of{" "}
                  {totalPages} selected)
                </Label>
                <div className="max-h-72 flex flex-wrap gap-2 overflow-y-scroll">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={
                        pagesToProcess.includes(i) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        handlePageSelection(i, !pagesToProcess.includes(i))
                      }
                    >
                      Page {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploading(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary"
              onClick={handleUpload}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex justify-center items-center">
                  <h1>Uploading</h1>
                  <Loader2 className="text-black h-6 w-6 animate-spin duration-500 ml-1" />
                </div>
              ) : (
                "Upload Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const goToPreviousPage = () => {
    setPageNumber((prevPage) => Math.max(prevPage - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prevPage) => Math.min(prevPage + 1, numPages));
  };

  return (
    <div className="flex h-screen overflow-hidden dark:bg-dark-secondary-500 rounded-xl">
      <div className="h-full w-1/3 border-r border-border overflow-y-auto p-4">
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedReport?.id === report.id ? "border-primary" : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-start gap-3 flex-1"
                      onClick={() => selectReport(report)}
                    >
                      <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
                      <div className="space-y-1">
                        <h3 className="font-medium">{report.title}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{report.author}</span>
                          <span className="mx-1">•</span>
                          <span>
                            {new Date(report.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {report.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {report.comments.length > 0 && (
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            <span>{report.comments.length} comments</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => selectReport(report)}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => shareReport()}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportReport()}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteReport(report.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No reports match your search criteria
            </div>
          )}
        </div>

        <UploadDialog />
      </div>

      <div className="w-2/3 flex flex-col overflow-hidden">
        {selectedReport ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedReport.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedReport.date).toLocaleDateString()} •{" "}
                  {selectedReport.author}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="mr-2"
                >
                  <TabsList className="h-9">
                    <TabsTrigger value="view" className="px-3">
                      View
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="px-3">
                      Comments
                    </TabsTrigger>
                    <TabsTrigger value="history" className="px-3">
                      History
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={exportReport}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Export Report</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={shareReport}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Share Report</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {activeTab === "view" && (
                <>
                  {/* PDF Viewer */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isAnnotating ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setIsAnnotating(!isAnnotating);
                            setIsSelecting(false);
                          }}
                          className={isAnnotating ? "bg-primary" : ""}
                        >
                          {isAnnotating
                            ? "Cancel Annotation"
                            : "Add Annotation"}
                        </Button>
                        <Button
                          variant={isSelecting ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            startSelection();
                            setIsAnnotating(false);
                          }}
                          className={isSelecting ? "bg-primary" : ""}
                        >
                          {isSelecting ? "Cancel Selection" : "AI Analysis"}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousPage}
                          disabled={pageNumber <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {pageNumber} of {numPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextPage}
                          disabled={pageNumber >= numPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setZoomLevel(Math.max(50, zoomLevel - 10))
                          }
                        >
                          -
                        </Button>
                        <span className="text-sm">{zoomLevel}%</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setZoomLevel(Math.min(200, zoomLevel + 10))
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div
                      className="flex-1 overflow-auto relative bg-muted/30"
                      ref={pdfContainerRef}
                      onClick={isAnnotating ? handleAnnotationClick : undefined}
                      onMouseDown={isSelecting ? handleMouseDown : undefined}
                    >
                      <Document
                        file={`${AI_SERVER_URL}/download/pdf/${selectedReport.file_hash}`}
                        onLoadSuccess={onDocumentLoadSuccess}
                      >
                        <Page pageNumber={pageNumber} scale={zoomLevel / 100} />
                      </Document>

                      {/* Selection area for AI analysis */}
                      {selectedArea && <div style={getSelectionStyle()} />}

                      {/* Render annotations */}
                      {annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className="absolute"
                          style={{
                            left: annotation.x - 8,
                            top: annotation.y - 8,
                            zIndex: 20,
                          }}
                        >
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center cursor-pointer"
                            style={{ backgroundColor: annotation.color }}
                          >
                            <span className="text-white text-xs font-bold">
                              !
                            </span>
                          </div>
                          <div className="absolute left-6 top-0 bg-card shadow-lg rounded-md p-2 w-64 text-xs border border-border">
                            <div className="font-medium mb-1">
                              {annotation.isAiGenerated
                                ? "AI Analysis"
                                : "Note"}
                            </div>
                            {annotation.text}
                            <div className="text-muted-foreground mt-1 text-xs">
                              {new Date(annotation.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Analysis Panel - shows up after selection */}
                  {aiAnalysis && (
                    <div className="w-80 border-l border-border overflow-y-auto p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">AI Analysis</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setAiAnalysis(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {aiAnalysis.loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="h-8 w-8 border-t-2 border-primary rounded-full animate-spin mb-2"></div>
                          <p className="text-sm text-muted-foreground">
                            Analyzing content...
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Card className="bg-muted/50">
                            <CardContent className="p-3 text-sm">
                              {aiAnalysis.result}
                              <div className="text-xs text-muted-foreground mt-2">
                                Generated:{" "}
                                {new Date(
                                  aiAnalysis.timestamp
                                ).toLocaleString()}
                              </div>
                            </CardContent>
                          </Card>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Actions</h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={saveAnalysisAsAnnotation}
                              >
                                Save as Annotation
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                Download
                              </Button>
                            </div>
                            <h4 className="text-sm font-medium mt-4">
                              Add comment
                            </h4>
                            <Textarea
                              placeholder="Add your thoughts on this analysis..."
                              className="text-sm"
                              rows={3}
                            />
                            <Button size="sm" className="w-full bg-primary">
                              <Check className="mr-1 h-3 w-3" /> Save Comment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === "comments" && (
                <div className="w-full overflow-y-auto p-4">
                  <h3 className="font-semibold mb-4">Comments & Discussions</h3>

                  <div className="space-y-4 mb-6">
                    {selectedReport.comments.length > 0 ? (
                      selectedReport.comments.map((comment) => (
                        <Card key={comment.id} className="bg-muted/30">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">
                                {comment.author}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(comment.date).toLocaleString()}
                              </div>
                            </div>
                            <p className="text-sm">{comment.text}</p>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No comments yet. Be the first to add a comment.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-2">Add a Comment</h4>
                    <Textarea
                      placeholder="Share your thoughts or feedback..."
                      className="mb-3"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <Button onClick={addComment} className="bg-primary">
                      <MessageSquare className="mr-2 h-4 w-4" /> Post Comment
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="w-full overflow-y-auto p-4">
                  <h3 className="font-semibold mb-4">Version History</h3>

                  <div className="space-y-4">
                    {selectedReport.versions.map((version) => (
                      <Card key={version.id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center">
                              <History className="h-4 w-4 mr-2 text-primary" />
                              <span className="font-medium">
                                Version {version.id}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(version.date).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm">{version.notes}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                Restore
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Report Selected</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Select a report from the list to view its content, add
              annotations, or perform AI analysis.
            </p>
            <Button className="bg-primary" onClick={() => setIsUploading(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Upload New Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
