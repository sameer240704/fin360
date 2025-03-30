"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle,
  Shield,
  Gift,
  Truck,
  Star,
  ChevronLeft,
  ChevronRight,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import Navbar from "./Navbar";
import Image from "next/image";
import { Apple, Google } from "@/public/icons";
import Link from "next/link";
import Phone from "./Phone";

const Fin360LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      <Navbar isScrolled={isScrolled} />
      <section className="h-screen bg-black text-white flex items-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center h-full py-8">
          <div className="max-md:w-1/2 mb-8 max-md:mb-0 w-full">
            <h1 className="text-7xl max-md:text-5xl max-lg:text-6xl font-bold mb-6">
              Automate Financial Analysis <br />
              <h1 className="mt-3">with AI-Powered Insights</h1>
            </h1>
            <p className="text-gray-300 mb-8 text-lg max-w-2xl">
              Transform the way you analyze financial statements. Our AI-driven
              platform extracts, interprets, and delivers actionable insights
              from balance sheets, income statements, and cash flow statements
              in real-time.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="#"
                className="flex items-center bg-black border border-gray-600 rounded-lg px-4 py-2 hover:border-gray-400 transition-colors"
              >
                <Image
                  src={Apple}
                  alt="App Store"
                  className="mr-5 h-8 w-auto"
                />
                <div>
                  <div className="text-xs">Download on the</div>
                  <div className="font-semibold">App Store</div>
                </div>
              </Link>

              <Link
                href="#"
                className="flex items-center bg-black border border-gray-600 rounded-lg px-4 py-2 hover:border-gray-400 transition-colors"
              >
                <Image
                  src={Google}
                  alt="Google Play"
                  className="mr-5 h-8 w-auto"
                />
                <div>
                  <div className="text-xs">GET IT ON</div>
                  <div className="font-semibold">Google Play</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center">
              <span className="text-gray-300 mr-2">Excellent 4.9 out of 5</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    className="text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center items-center h-full">
            <div className="relative w-full max-w-sm max-md:max-w-md max-lg:max-w-lg max-xl:max-w-xl">
              <Phone />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Fin360LandingPage;
