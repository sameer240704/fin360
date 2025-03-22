import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Briefcase,
  Gift,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const categoryIcons = {
  salary: Briefcase,
  investment: TrendingUp,
  gift: Gift,
  other: Landmark,
};

export const IncomeTab = () => {
  const [incomes, setIncomes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formData, setFormData] = useState({
    source: "",
    amount: "",
    frequency: "monthly",
    category: "salary",
    date: new Date().toISOString().split("T")[0],
  });

  // Load incomes from localStorage on component mount
  useEffect(() => {
    const savedIncomes = localStorage.getItem("userIncomes");
    if (savedIncomes) {
      try {
        const parsedIncomes = JSON.parse(savedIncomes);
        setIncomes(parsedIncomes);
      } catch (error) {
        console.error("Error loading incomes from localStorage:", error);
        setIncomes([]);
      }
    }
  }, []);

  // Save incomes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userIncomes", JSON.stringify(incomes));
  }, [incomes]);

  const handleAdd = () => {
    setIsEditing(false);
    setFormData({
      source: "",
      amount: "",
      frequency: "monthly",
      category: "salary",
      date: new Date().toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (income) => {
    setIsEditing(true);
    setSelectedIncome(income.id);
    setFormData({
      source: income.source,
      amount: income.amount.toString(),
      frequency: income.frequency,
      category: income.category,
      date: income.date,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setIncomes(incomes.filter((income) => income.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newIncome = {
      id: isEditing ? selectedIncome : Math.random().toString(36).substr(2, 9),
      source: formData.source,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      category: formData.category,
      date: formData.date,
    };

    if (isEditing) {
      setIncomes(
        incomes.map((income) =>
          income.id === selectedIncome ? newIncome : income
        )
      );
    } else {
      setIncomes([...incomes, newIncome]);
    }

    setIsModalOpen(false);
  };

  const getTotalMonthlyIncome = () => {
    return incomes.reduce((total, income) => {
      const amount = income.amount;
      switch (income.frequency) {
        case "monthly":
          return total + amount;
        case "yearly":
          return total + amount / 12;
        case "one-time":
          return total;
        default:
          return total;
      }
    }, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fillDemoData = () => {
    const demoIncomes = [
      {
        source: "Software Engineer Salary",
        amount: "150000",
        frequency: "monthly",
        category: "salary",
        date: new Date().toISOString().split("T")[0],
      },
      {
        source: "Stock Market Returns",
        amount: "50000",
        frequency: "monthly",
        category: "investment",
        date: new Date().toISOString().split("T")[0],
      },
      {
        source: "Freelance Project",
        amount: "200000",
        frequency: "one-time",
        category: "other",
        date: new Date().toISOString().split("T")[0],
      },
      {
        source: "Dividend Income",
        amount: "75000",
        frequency: "yearly",
        category: "investment",
        date: new Date().toISOString().split("T")[0],
      },
    ];

    const randomIncome =
      demoIncomes[Math.floor(Math.random() * demoIncomes.length)];
    setFormData({
      ...formData,
      ...randomIncome,
    });
  };

  return (
    <div className="bg-secondary-100 dark:bg-dark-secondary-100 rounded-lg shadow-sm p-6 space-y-8">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">
            Total Monthly Income
          </h3>
          <div className="mt-4 flex items-baseline">
            <span className="text-3xl font-bold">
              {formatCurrency(getTotalMonthlyIncome())}
            </span>
            <span className="ml-2 text-sm opacity-75">/month</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary-100 dark:bg-dark-primary-100 rounded-xl p-4">
            <h4 className="text-sm font-medium text-primary-700 dark:text-dark-primary-900">
              Active Sources
            </h4>
            <p className="mt-2 text-2xl font-semibold text-primary-900 dark:text-dark-primary-700">
              {incomes.length}
            </p>
          </div>
          <div className="bg-primary-100 dark:bg-dark-primary-100 rounded-xl p-4">
            <h4 className="text-sm font-medium text-primary-700 dark:text-dark-primary-900">
              Yearly Total
            </h4>
            <p className="mt-2 text-2xl font-semibold text-primary-900 dark:text-dark-primary-700">
              {formatCurrency(getTotalMonthlyIncome() * 12)}
            </p>
          </div>
        </div>
      </div>

      {/* Income List */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Income Sources
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </motion.button>
        </div>

        <div className="space-y-4">
          {incomes.map((income) => {
            const Icon = categoryIcons[income.category];
            return (
              <div
                key={income.id}
                className="bg-secondary-200 dark:bg-dark-secondary-100 border border-secondary-300 dark:border-dark-secondary-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`p-2 rounded-lg ${
                        income.category === "salary"
                          ? "bg-primary-200 text-primary-700"
                          : income.category === "investment"
                          ? "bg-primary-100 text-primary-600"
                          : income.category === "gift"
                          ? "bg-primary-300 text-primary-800"
                          : "bg-secondary-300 text-secondary-900"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {income.source}
                      </h3>
                      <p className="text-sm text-secondary-900 dark:text-secondary-400">
                        {income.frequency.charAt(0).toUpperCase() +
                          income.frequency.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-primary-600 dark:text-dark-primary-500">
                      {formatCurrency(income.amount)}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-1 text-secondary-700 hover:text-primary-600 transition-colors"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-1 text-secondary-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-secondary-900/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-secondary-100 dark:bg-dark-secondary-100 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddGoal}
                className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Asset
              </motion.button>
              <h3 className="text-xl font-semibold text-primary-900 dark:text-dark-primary-100">
                {isEditing ? "Edit Income Source" : "Add Income Source"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-secondary-700 hover:text-secondary-900 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-300 mb-2">
                  Source Name
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-secondary-400 dark:border-dark-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-secondary-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-secondary-600 dark:text-secondary-500">
                      ₹
                    </span>
                  </div>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full pl-10 px-4 py-2 rounded-lg border border-secondary-400 dark:border-dark-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-secondary-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-300 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({ ...formData, frequency: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-secondary-400 dark:border-dark-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-secondary-200"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-secondary-400 dark:border-dark-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-secondary-200"
                  >
                    <option value="salary">Salary</option>
                    <option value="investment">Investment</option>
                    <option value="gift">Gift</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-900 dark:text-secondary-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-secondary-400 dark:border-dark-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-secondary-200"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={fillDemoData}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-100 dark:bg-dark-primary-900 text-primary-700 dark:text-dark-primary-300 hover:bg-primary-200 dark:hover:bg-dark-primary-800 transition-colors"
                >
                  Demo Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-secondary-400 dark:border-dark-secondary-300 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-dark-secondary-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-colors"
                >
                  {isEditing ? "Save Changes" : "Add Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
