"use client";

import { useState } from "react";
import { IndianRupee, Wallet } from "lucide-react";
import { HoldingsTab } from "@/components/MyPortfolio/tabs/HoldingsTab";
import { IncomeTab } from "@/components/MyPortfolio/tabs/IncomeTab";

const MyPortfolio = () => {
  const [activeTab, setActiveTab] = useState("holdings");

  const tabs = [
    {
      id: "holdings",
      label: "Holdings & Investment Breakdown",
      icon: IndianRupee,
      activeColor: "text-primary-600",
      hoverColor: "hover:text-purple-500",
    },
    {
      id: "transactions",
      label: "Transactions & Activity History",
      icon: Wallet,
      activeColor: "text-primary-600",
      hoverColor: "hover:text-green-500",
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "holdings":
        return <HoldingsTab />;
      case "transactions":
        return <IncomeTab />;
      default:
        return null;
    }
  };

  return (
    <div className="py-4">
      <div className="mx-auto px-4 max-sm:px-6 max-lg:px-8">
        <div className="flex space-x-1 rounded-xl bg-gray-200 dark:bg-gray-700 p-1 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex justify-center items-center space-x-2 flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `bg-white dark:bg-gray-800 ${tab.activeColor} shadow-sm`
                    : `text-gray-500 dark:text-gray-400 ${tab.hoverColor}`
                }`}
              >
                <Icon
                  className={`h-5 w-auto ${isActive ? tab.activeColor : ""}`}
                />
                <span className="text-lg">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
};

export default MyPortfolio;
