import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Home,
  Activity,
  Calendar,
  Clock,
  PhoneCall,
  Wifi,
  BatteryFull,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { Amazon } from "@/public/icons";

export default function Phone() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="relative w-full max-w-[360px] h-[720px] rounded-[40px] overflow-hidden bg-slate-900/40 shadow-2xl border-4 border-gray-800">
        <div className="absolute top-0 w-full px-6 pt-3 pb-1 flex justify-between items-center text-white z-30">
          <div className="text-xs font-medium">9:41</div>
          <div className="w-[110px] h-[30px] bg-black rounded-full absolute top-1 left-1/2 transform -translate-x-1/2 border" />
          <div className="flex items-center gap-1 text-xs">
            <Wifi className="h-4 w-auto" />
            <PhoneCall className="h-3 w-auto" />
            <BatteryFull className="h-4 w-auto" />
          </div>
        </div>

        <div className="absolute inset-0 w-full h-full opacity-5">
          <div className="w-full h-full grid grid-cols-12 grid-rows-24">
            {Array.from({ length: 288 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-gray-500" />
            ))}
          </div>
        </div>

        <div className="relative z-10 h-full flex flex-col text-white pt-8">
          <div className="flex justify-between items-center px-6 mt-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-gray-700">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="@shadcn"
                />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                  SM
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  Hi, Sameer <span className="text-yellow-400">👋</span>
                </p>
                <p className="text-xs text-gray-400">Let's track your money!</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-800 bg-opacity-40 flex items-center justify-center">
                <div className="relative">
                  <Bell className="h-4 w-auto" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></div>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-800 bg-opacity-40 flex items-center justify-center">
                <div className="flex flex-col gap-1">
                  <div className="w-3.5 h-0.5 bg-white rounded-full"></div>
                  <div className="w-3.5 h-0.5 bg-white rounded-full"></div>
                  <div className="w-3.5 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-lg dark:from-dark-primary-600 dark:to-dark-primary-700">
            <p className="text-xs text-white text-opacity-80 mb-1 font-bold">
              My balance
            </p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">₹52,300.00</p>
              <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
            </div>

            <div className="flex mt-4 gap-2">
              <div className="flex-1 bg-white bg-opacity-20 rounded-lg p-2">
                <p className="text-xs text-white text-opacity-80">Income</p>
                <p className="text-sm font-semibold">₹8,500</p>
              </div>
              <div className="flex-1 bg-white bg-opacity-20 rounded-lg p-2">
                <p className="text-xs text-white text-opacity-80">Expenses</p>
                <p className="text-sm font-semibold">₹3,280</p>
              </div>
            </div>
          </div>

          <div className="px-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold">Statistics</p>
              <div className="bg-gray-800 rounded-full px-3 py-1 text-xs flex items-center">
                6 Months <ChevronDown className="ml-2 h-3 w-auto" />
              </div>
            </div>

            <div className="flex h-32 items-end justify-between px-2">
              {[
                { month: "Jan", height: "h-16", value: "₹3.2k" },
                { month: "Feb", height: "h-10", value: "₹2.1k" },
                { month: "Mar", height: "h-20", value: "₹4.5k" },
                {
                  month: "Apr",
                  height: "h-24",
                  highlighted: true,
                  value: "₹5.2k",
                },
                { month: "May", height: "h-12", value: "₹2.8k" },
                { month: "Jun", height: "h-16", value: "₹3.6k" },
              ].map((bar, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-1 w-12"
                >
                  <p className="text-xs text-gray-400">{bar.value}</p>
                  <div
                    className={`w-6 rounded-t-md ${
                      bar.highlighted
                        ? "bg-gradient-to-t from-primary-400 to-primary-600 dark:from-dark-primary-400 dark:to-dark-primary-600"
                        : "bg-gray-700"
                    } ${bar.height}`}
                  ></div>
                  <span className="text-xs text-gray-400">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 mt-6">
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold">Recent Transactions</p>
              <p className="text-xs text-primary-400 dark:text-dark-primary-400">
                See All
              </p>
            </div>

            <Card className="bg-gray-800 bg-opacity-40 border-0 rounded-xl mb-1">
              <div className="flex items-center px-1 py-2">
                <Image src={Amazon} className="h-10 w-10 rounded-md mr-3" />

                <div className="flex-1">
                  <p className="font-medium">Amazon</p>
                  <p className="text-xs text-gray-400">Keychron K2 Keyboard</p>
                </div>
                <div className="flex items-center">
                  <p className="font-semibold text-red-400">-₹80</p>
                  <ChevronRight className="ml-2 h-4 w-auto" />
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 bg-opacity-40 border-0 rounded-xl mb-3">
              <div className="flex items-center px-1 py-2">
                <div className="h-10 w-10 rounded-md bg-green-900 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                </div>

                <div className="flex-1">
                  <p className="font-medium">Gojek</p>
                  <p className="text-xs text-gray-400">GoFood - Soe oyam</p>
                </div>
                <div className="flex items-center">
                  <p className="font-semibold text-red-400">-₹10</p>
                  <ChevronRight className="ml-2 h-4 w-auto" />
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-auto bg-gray-900 bg-opacity-60 backdrop-blur-md h-16 rounded-t-2xl flex justify-around items-center px-4">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center dark:text-dark-primary-600">
                <Home className="h-5 w-5 text-white" />
              </div>
              <p className="text-[10px] mt-0.5 text-primary-600 font-bold dark:text-dark-primary-600">
                Home
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <p className="text-[10px] mt-0.5 text-gray-500">Stats</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-[10px] mt-0.5 text-gray-500">Calendar</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-[10px] mt-0.5 text-gray-500">History</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
