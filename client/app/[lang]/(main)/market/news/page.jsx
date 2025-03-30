"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  ExternalLink,
  Search,
  Loader,
  DollarSign,
  LineChart,
  BarChart4,
  Briefcase,
  Award,
  Globe,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";

const CATEGORIES = [
  {
    id: "all",
    label: "All News",
    icon: Globe,
    searchTerms: [
      "market trends",
      "stock analysis",
      "financial insights",
      "economic outlook",
      "investment strategies",
    ],
  },
  {
    id: "markets",
    label: "Markets",
    icon: TrendingUp,
    searchTerms: [
      "stock market",
      "market analysis",
      "market movements",
      "trading insights",
      "market volatility",
    ],
  },
  {
    id: "investments",
    label: "Investments",
    icon: DollarSign,
    searchTerms: [
      "investment strategies",
      "portfolio management",
      "asset allocation",
      "wealth creation",
      "investment returns",
    ],
  },
  {
    id: "economy",
    label: "Economy",
    icon: LineChart,
    searchTerms: [
      "economic indicators",
      "GDP growth",
      "inflation rates",
      "economic policy",
      "fiscal measures",
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    searchTerms: [
      "corporate earnings",
      "business growth",
      "company performance",
      "mergers acquisitions",
      "business strategy",
    ],
  },
  {
    id: "insights",
    label: "Expert Insights",
    icon: Award,
    searchTerms: [
      "financial experts",
      "market analysis",
      "investment advice",
      "financial planning",
      "wealth management",
    ],
  },
];

const NewsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewStyle, setViewStyle] = useState("grid"); // grid or list
  const { dict } = useLanguage();

  const fetchNews = async (category) => {
    setLoading(true);
    setError("");
    try {
      const searchTerms = category.searchTerms
        .map((term) => `"${term}"`)
        .join(" OR ");

      const contextTerms = "finance OR markets OR economy OR investment";

      const finalQuery = encodeURIComponent(
        `(${searchTerms}) AND (${contextTerms})`
      );

      const response = await fetch(
        `https://gnews.io/api/v4/search?q=${finalQuery}&lang=en&country=in&max=10&sortby=relevance&apikey=${process.env.NEXT_PUBLIC_GNEWS_API_KEY}`
      );

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0]);
      }

      const validArticles = (data.articles || []).filter(
        (article) =>
          article.title &&
          article.description &&
          article.url &&
          article.publishedAt
      );

      const uniqueArticles = Array.from(
        new Map(validArticles.map((article) => [article.url, article])).values()
      );

      setNews(uniqueArticles);
    } catch (err) {
      setError("Failed to fetch financial news. Please try again later.");
      console.error("Error fetching news:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCategory);
  }, [selectedCategory]);

  const filteredNews = news.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };

  const isHotNews = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );
    return diffInHours < 12;
  };

  return (
    <div className="h-full py-4 overflow-y-scroll px-2">
      <div className="mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search financial news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-dark-secondary-300 bg-white dark:bg-dark-secondary-300 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewStyle("grid")}
              className={`p-2 rounded-lg ${
                viewStyle === "grid"
                  ? "bg-primary-500 text-white"
                  : "bg-white dark:bg-dark-secondary-300 text-gray-500 dark:text-gray-300"
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewStyle("list")}
              className={`p-2 rounded-lg ${
                viewStyle === "list"
                  ? "bg-primary-500 text-white"
                  : "bg-white dark:bg-dark-secondary-300 text-gray-500 dark:text-gray-300"
              }`}
            >
              <AlignJustify className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center whitespace-nowrap ${
                selectedCategory.id === category.id
                  ? "bg-primary-500 text-white shadow-md"
                  : "bg-white dark:bg-dark-secondary-300 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-secondary-200"
              }`}
            >
              <category.icon className="h-4 w-4 mr-1.5" />
              {category.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="bg-white dark:bg-dark-secondary-300 rounded-lg shadow-md p-8 flex flex-col items-center">
              <Loader className="h-10 w-10 text-primary-500 dark:text-dark-primary-500 animate-spin" />
              <span className="mt-4 text-gray-600 dark:text-gray-300">
                Loading financial insights...
              </span>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {viewStyle === "grid" ? (
              <div className="grid gap-6 md:grid-cols-2 max-lg:grid-cols-3">
                {filteredNews.map((article, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-dark-secondary-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 dark:border-dark-secondary-200 group"
                  >
                    <div className="aspect-w-16 aspect-h-9 relative">
                      <Image
                        src={
                          article.image ||
                          "https://images.unsplash.com/photo-1579532536935-619928decd08?q=80&w=1000&auto=format&fit=crop"
                        }
                        height={100}
                        width={100}
                        alt={article.title}
                        className="object-cover w-full h-48 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1579532536935-619928decd08?q=80&w=1000&auto=format&fit=crop";
                        }}
                      />
                      {isHotNews(article.publishedAt) && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                          <span className="animate-pulse mr-1">●</span> BREAKING
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(article.publishedAt)}
                        </div>
                        <div className="flex items-center text-xs px-2 py-1 bg-gray-100 dark:bg-dark-secondary-400 rounded-full">
                          {article.source.name}
                        </div>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-500 dark:group-hover:text-dark-primary-500 transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 text-sm">
                        {article.description}
                      </p>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-dark-primary-400 hover:text-primary-500 group-hover:underline"
                      >
                        Read Analysis <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {filteredNews.map((article, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-dark-secondary-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 dark:border-dark-secondary-200 flex"
                  >
                    <div className="w-1/4 relative">
                      <Image
                        src={
                          article.image ||
                          "https://images.unsplash.com/photo-1579532536935-619928decd08?q=80&w=1000&auto=format&fit=crop"
                        }
                        height={100}
                        width={100}
                        alt={article.title}
                        className="object-cover w-full h-48"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1579532536935-619928decd08?q=80&w=1000&auto=format&fit=crop";
                        }}
                      />
                      {isHotNews(article.publishedAt) && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center">
                          <span className="animate-pulse mr-1">●</span> BREAKING
                        </div>
                      )}
                    </div>
                    <div className="w-3/4 p-5">
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(article.publishedAt)}
                        </div>
                        <div className="flex items-center text-xs px-2 py-1 bg-gray-100 dark:bg-dark-secondary-400 rounded-full">
                          {article.source.name}
                        </div>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-primary-500 dark:hover:text-dark-primary-500 transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2 text-sm">
                        {article.description}
                      </p>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-dark-primary-400 hover:text-primary-500 hover:underline"
                      >
                        Read Analysis <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && filteredNews.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white dark:bg-dark-secondary-300 rounded-lg shadow-md p-8">
              <p className="text-gray-500 dark:text-gray-400">
                No financial news found matching your criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory(CATEGORIES[0]);
                }}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
