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

const UnineLandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar isScrolled={isScrolled} />

      <section className="h-screen bg-black text-white flex items-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center h-full py-8">
          <div className="max-md:w-1/2 mb-8 max-md:mb-0 w-full">
            <h1 className="text-8xl max-md:text-5xl max-lg:text-6xl font-bold mb-6">
              More Payment Options <br />
              <h1 className="mt-3">Better than Cash</h1>
            </h1>
            <p className="text-gray-300 mb-8 text-lg max-w-xl">
              With Fin360, you can access more than 240 million customers out
              there, as well as offering management tools, options and payment
              methods.
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

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">
            Safe & Convenient Transaction
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Want to pay anything so easy with the touch of a finger. Through
            UNINE, you can make practically any transaction.
          </p>
        </div>

        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="text-green-500" size={24} />
              </div>
              <h3 className="font-bold mb-2">Always Protected</h3>
              <p className="text-gray-500 text-sm">
                Shopping with UNINE even more secure thanks to Buyer Protection.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-400 border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4">
                <Gift className="text-green-500" size={24} />
              </div>
              <h3 className="font-bold mb-2">Get Reward</h3>
              <p className="text-gray-700 text-sm">
                You can keep using your favorite card and keep getting rewards.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="text-green-500" size={24} />
              </div>
              <h3 className="font-bold mb-2">No Hidden Fees</h3>
              <p className="text-gray-500 text-sm">
                You only pay the charges when selling goods or requesting
                payment.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Truck className="text-green-500" size={24} />
              </div>
              <h3 className="font-bold mb-2">Free shipping</h3>
              <p className="text-gray-500 text-sm">
                Change your mind after buying? Send back the item you purchased!
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bank Account Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h3 className="text-xl font-bold mb-2">Bank Accounts</h3>
            <p className="text-gray-500 text-sm mb-4">
              High interest FDIC insured checking for individuals and businesses
            </p>

            <Button
              variant="outline"
              className="rounded-full border-green-500 text-green-500 hover:bg-green-50"
            >
              Learn more
            </Button>

            <div className="mt-8 relative">
              <img
                src="/api/placeholder/350/150"
                alt="Chart showing growth"
                className="w-full max-w-md"
              />
            </div>
          </div>

          <div className="md:w-1/2 pl-0 md:pl-12">
            <h3 className="text-xl font-bold mb-2 flex items-center">
              Keep your cash flow clear 📊
              <br />
              and keep increasing 🚀
            </h3>
            <p className="text-gray-500 mb-6">
              See it all at a glance when you link your cash accounts, credit
              cards, investments, and bills.
            </p>

            <Button className="rounded-full bg-green-500 hover:bg-green-600 text-white">
              Try for free <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Payment Management Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h3 className="text-xl font-bold mb-6">
              Manage regular <br />
              payments easily 😃
            </h3>

            <div className="grid grid-cols-2 gap-6 max-w-md">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-500">🌎</div>
                </div>
                <h4 className="font-bold mb-2">Globality</h4>
                <p className="text-gray-500 text-sm">
                  Send payments to the person from anywhere across the world
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-500">🏛️</div>
                </div>
                <h4 className="font-bold mb-2">Integrate</h4>
                <p className="text-gray-500 text-sm">
                  We work with local banks and businesses you like to visit
                </p>
              </div>
            </div>
          </div>

          <div className="md:w-1/2">
            <div className="flex mb-6">
              <h3 className="text-xl font-bold">Payments</h3>
            </div>
            <p className="text-gray-500 mb-6">
              From direct transfers, Custom Payments to automatic ACH, checks,
              and more
            </p>

            <div className="relative">
              <img
                src="/api/placeholder/400/200"
                alt="Payment interface"
                className="w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-12 text-center">
            Our Customers Says
          </h2>

          <div className="relative">
            <div className="flex flex-col md:flex-row gap-8 overflow-hidden">
              <div className="bg-white p-6 rounded-lg shadow-sm md:w-1/2">
                <h4 className="font-bold mb-4">
                  I paid off $24,000 first year
                </h4>
                <p className="text-gray-600 mb-4">
                  "Using the system became a game and I would have been in
                  banking without it within a year"
                </p>
                <div className="text-yellow-500 mb-4">
                  Thanks for being online, UNINE 🙌🏼
                </div>

                <div className="flex items-center">
                  <div className="mr-4">
                    <img
                      src="/api/placeholder/40/40"
                      alt="Ronald Richards"
                      className="w-10 h-10 rounded-full"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">Ronald Richards</div>
                    <div className="text-gray-500 text-sm">
                      Marketing Coordinator
                    </div>
                  </div>
                  <div className="ml-auto flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i <= 4
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm md:w-1/2">
                <h4 className="font-bold mb-4">My net worth is already $43k</h4>
                <p className="text-gray-600 mb-4">
                  "When I got involved in this market I found of fluidity, I
                  never knew money grows so fast"
                </p>
                <div className="text-yellow-500 mb-4">
                  I never turned back 🙌🏼
                </div>

                <div className="flex items-center">
                  <div className="mr-4">
                    <img
                      src="/api/placeholder/40/40"
                      alt="Wade Warren"
                      className="w-10 h-10 rounded-full"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">Wade Warren</div>
                    <div className="text-gray-500 text-sm">
                      Marketing Coordinator
                    </div>
                  </div>
                  <div className="ml-auto flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i <= 5
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <Button
                variant="outline"
                className="rounded-full bg-white h-8 w-8 p-0"
              >
                <ChevronLeft size={16} />
              </Button>
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <Button
                variant="outline"
                className="rounded-full bg-white h-8 w-8 p-0"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className="py-12 bg-green-400">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">
            Get Unine App on Google Play or App Store
          </h2>
          <p className="text-gray-700 mb-6">
            Build your financial literacy within a transparent community.
            <br />
            Follow other investors, share insights with people.
          </p>

          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              className="bg-black text-white border-none hover:bg-gray-800"
            >
              <img src="/api/placeholder/20/20" alt="Apple" className="mr-2" />{" "}
              App Store
            </Button>
            <Button
              variant="outline"
              className="bg-black text-white border-none hover:bg-gray-800"
            >
              <img
                src="/api/placeholder/20/20"
                alt="Google Play"
                className="mr-2"
              />{" "}
              Google Play
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="text-xl font-bold">un nine</div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-gray-400 text-sm">
                Technology Park B-14
                <br />
                Marie Curie Street
                <br />
                08042 Barcelona
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Learn</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>
                  <a href="#" className="hover:text-white">
                    App
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Community
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Legal Mentions</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Services
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-4 border-t border-gray-700 text-gray-400 text-xs">
            © 2022 COPYRIGHT BY UNINE
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UnineLandingPage;
