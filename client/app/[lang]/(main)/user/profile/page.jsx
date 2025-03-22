"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  LogOut,
  Shield,
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Briefcase,
  TrendingUp,
  FileText,
  Check,
  Bell,
  Computer,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getUserDetails, updateUser } from "@/lib/actions/user.action";
import { Checkbox } from "@/components/ui/checkbox";

const ProfilePage = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [activeSection, setActiveSection] = useState("personal");
  const [isUpdating, setIsUpdating] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(
    user?.publicMetadata?.phoneNumber || ""
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.publicMetadata?.dateOfBirth || ""
  );

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [accountType, setAccountType] = useState("individual");
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [investmentGoals, setInvestmentGoals] = useState([]);
  const [preferredCurrency, setPreferredCurrency] = useState("USD");

  const [kycVerified, setKycVerified] = useState(false);
  const [identityDocuments, setIdentityDocuments] = useState([]);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [dataVisualization, setDataVisualization] = useState("simple");
  const [aiAssistanceLevel, setAiAssistanceLevel] = useState("basic");

  const sidebarItems = [
    { icon: User, label: "Personal Info", section: "personal" },
    { icon: Briefcase, label: "Financial Profile", section: "financial" },
    { icon: FileText, label: "Documents & KYC", section: "kyc" },
    { icon: Shield, label: "Security", section: "security" },
    { icon: Bell, label: "Notifications", section: "notifications" },
  ];

  const investmentGoalOptions = [
    "Retirement",
    "Capital Growth",
    "Income Generation",
    "Tax Optimization",
    "Education Funding",
    "Home Purchase",
    "Wealth Preservation",
  ];

  const currencyOptions = [
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "INR", name: "Indian Rupee" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "BTC", name: "Bitcoin" },
    { code: "ETH", name: "Ethereum" },
  ];

  const toggleInvestmentGoal = (goal) => {
    if (investmentGoals.includes(goal)) {
      setInvestmentGoals(investmentGoals.filter((g) => g !== goal));
    } else {
      setInvestmentGoals([...investmentGoals, goal]);
    }
  };

  const handleDocumentUpload = (type) => {
    const newDocument = {
      documentType: type,
      documentNumber: `DOC-${Math.floor(Math.random() * 10000)}`,
      verificationStatus: "pending",
      uploadDate: new Date(),
    };

    setIdentityDocuments([...identityDocuments, newDocument]);

    toast({
      title: "Document Uploaded",
      description: `Your ${type} has been uploaded and is pending verification.`,
    });
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const userId = user?.publicMetadata?.userId;
        if (!userId) return;

        const existingUser = await getUserDetails(userId);

        setFirstName(user?.firstName);
        setLastName(user?.lastName);
        setPhoneNumber(existingUser?.phoneNumber);

        const date = new Date(existingUser?.dateOfBirth);
        const formattedDate = date.toISOString().split("T")[0];
        setDateOfBirth(formattedDate);

        if (existingUser?.address) {
          setStreet(existingUser.address.street || "");
          setCity(existingUser.address.city || "");
          setState(existingUser.address.state || "");
          setCountry(existingUser.address.country || "");
          setPostalCode(existingUser.address.postalCode || "");
        }

        if (existingUser?.financialProfile) {
          setAccountType(
            existingUser.financialProfile.accountType || "individual"
          );
          setRiskTolerance(
            existingUser.financialProfile.riskTolerance || "moderate"
          );
          setInvestmentGoals(
            existingUser.financialProfile.investmentGoals || []
          );
          setPreferredCurrency(
            existingUser.financialProfile.preferredCurrency || "USD"
          );
        }

        setKycVerified(existingUser?.kycVerified || false);
        setIdentityDocuments(existingUser?.identityDocuments || []);

        if (existingUser?.preferences) {
          if (existingUser.preferences.notifications) {
            setEmailNotifications(existingUser.preferences.notifications.email);
            setSmsNotifications(existingUser.preferences.notifications.sms);
            setInAppNotifications(existingUser.preferences.notifications.inApp);
          }
          setDataVisualization(
            existingUser.preferences.dataVisualization || "simple"
          );
          setAiAssistanceLevel(
            existingUser.preferences.aiAssistanceLevel || "basic"
          );
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (user) {
      fetchUserDetails();
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    setIsUpdating(true);
    try {
      const userId = user?.publicMetadata?.userId;

      if (userId) {
        await updateUser(userId, {
          phoneNumber,
          dateOfBirth,

          address: {
            street,
            city,
            state,
            country,
            postalCode,
          },

          financialProfile: {
            accountType,
            riskTolerance,
            investmentGoals,
            preferredCurrency,
          },

          preferences: {
            notifications: {
              email: emailNotifications,
              sms: smsNotifications,
              inApp: inAppNotifications,
            },
            dataVisualization,
            aiAssistanceLevel,
          },
        });
      }

      toast({
        title: "Profile Updated Successfully!",
        description: `${firstName} ${lastName}, your details have been updated`,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Profile Update Error!",
        description:
          "An error occurred while updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderPersonalInfoSection = () => {
    return (
      <div className="space-y-6">
        <div className="relative flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 mx-auto flex items-center justify-center shadow-xl overflow-hidden">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={`${firstName} ${lastName}'s profile photo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-16 w-16 text-primary-600 dark:text-primary-300" />
            )}
          </div>
          <button
            onClick={() =>
              toast({
                title: "Image upload feature coming soon!",
              })
            }
            className="absolute bottom-10 right-1/2 translate-x-12 translate-y-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors hover:scale-110 duration-300"
            title="Upload profile photo"
          >
            <Camera className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Click the camera icon to update your profile picture
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 absolute ml-3" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-12 w-full pl-12 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 absolute ml-3" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9082201988"
                  className="h-12 w-full pl-12 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="flex items-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <Mail className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-300">
                  {user?.primaryEmailAddress?.emailAddress ||
                    "No email address"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact support for assistance.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Address
          </label>
          <div className="space-y-3">
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Street Address"
              className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State/Province"
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Postal Code"
                className="h-12 w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
          <button
            onClick={() => {
              setFirstName(user?.firstName || "");
              setLastName(user?.lastName || "");
              setPhoneNumber(user?.publicMetadata?.phoneNumber || "");
              setDateOfBirth(user?.publicMetadata?.dateOfBirth || "");

              setStreet("");
              setCity("");
              setState("");
              setCountry("");
              setPostalCode("");
            }}
            className="px-6 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isUpdating}
          >
            Reset Changes
          </button>
          <button
            onClick={handleProfileUpdate}
            className={`px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center ${
              isUpdating ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderFinancialProfileSection = () => {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your financial profile helps us tailor our AI analysis and
          recommendations to your specific needs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Tolerance
              </label>
              <select
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Currency
              </label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Investment Goals (Select all that apply)
            </label>
            <div className="space-y-2 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              {investmentGoalOptions.map((goal) => (
                <div key={goal} className="flex items-center">
                  <Checkbox
                    id={`goal-${goal}`}
                    onChange={() => toggleInvestmentGoal(goal)}
                  />
                  <label
                    htmlFor={`goal-${goal}`}
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    {goal}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gradient-to-r from-primary-50 to-primary-50 dark:from-primary-900/20 dark:to-primary-900/20 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Data Visualization & AI Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Visualization Preference
              </label>
              <select
                value={dataVisualization}
                onChange={(e) => setDataVisualization(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="simple">
                  Simple - Easy to understand visualizations
                </option>
                <option value="detailed">
                  Detailed - More comprehensive data displays
                </option>
                <option value="technical">
                  Technical - Advanced charts with technical indicators
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AI Assistance Level
              </label>
              <select
                value={aiAssistanceLevel}
                onChange={(e) => setAiAssistanceLevel(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
              >
                <option value="basic">
                  Basic - Simple explanations and guidance
                </option>
                <option value="advanced">
                  Advanced - Detailed analysis and recommendations
                </option>
                <option value="expert">
                  Expert - Comprehensive technical analysis and insights
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
          <button
            onClick={handleProfileUpdate}
            className={`px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center ${
              isUpdating ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    );
  };

  const renderKycSection = () => {
    return (
      <div className="space-y-6">
        <div
          className={`bg-${kycVerified ? "green" : "yellow"}-50 dark:bg-${
            kycVerified ? "green" : "yellow"
          }-900/20 p-4 rounded-lg`}
        >
          <div className="flex items-center">
            {kycVerified ? (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            )}
            <span
              className={`text-sm text-${
                kycVerified ? "green" : "yellow"
              }-800 dark:text-${kycVerified ? "green" : "yellow"}-200`}
            >
              {kycVerified
                ? "Your account is fully verified"
                : "Complete verification to access all platform features"}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Identity Verification
        </h3>

        <div className="space-y-4">
          {identityDocuments.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Your Documents
                </h4>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {identityDocuments.map((doc, index) => (
                  <li key={index} className="px-4 py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {doc.documentType}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {doc.documentNumber}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          doc.verificationStatus === "verified"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : doc.verificationStatus === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                        }`}
                      >
                        {doc.verificationStatus.charAt(0).toUpperCase() +
                          doc.verificationStatus.slice(1)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                No Documents Uploaded
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Please upload your identification documents to complete
                verification
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleDocumentUpload("Government ID")}
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="text-center">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Upload Government ID
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Passport, Driver's License, or ID Card
                </p>
              </div>
            </button>

            <button
              onClick={() => handleDocumentUpload("Proof of Address")}
              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="text-center">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Upload Proof of Address
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Utility Bill, Bank Statement, or Lease Agreement
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
          <button
            onClick={handleProfileUpdate}
            className={`px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center ${
              isUpdating ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving..." : "Save Documents"}
          </button>
        </div>
      </div>
    );
  };

  const renderSecuritySection = () => {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">
          Password & Authentication
        </h3>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <button
            onClick={() =>
              toast({
                title: "Password Management",
                description:
                  "Password change functionality is handled by Clerk Authentication.",
              })
            }
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  Change Password
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update your account password
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>

        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 pt-4">
          Two-Factor Authentication
        </h3>

        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mr-4">
              <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">
                Two-Factor Authentication
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add an extra layer of security to your account
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              toast({
                title: "2FA Management",
                description:
                  "2FA is managed through Clerk Authentication system.",
              })
            }
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Setup 2FA
          </button>
        </div>

        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 pt-4">
          Sessions & Activity
        </h3>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">
              Current Session
            </h4>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4">
                  <Computer className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Current Browser Session
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last active: Now
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
          <button
            onClick={() =>
              toast({
                title: "Security Log",
                description:
                  "Security activity log is not available in this view.",
                variant: "default",
              })
            }
            className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            View Security Log
          </button>
        </div>
      </div>
    );
  };

  const renderNotificationsSection = () => {
    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Manage how and when you receive notifications about your account,
          market updates, and platform features.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">
              Communication Preferences
            </h4>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Email Notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive updates via email
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={() => setEmailNotifications(!emailNotifications)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    SMS Notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive updates via text message
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={() => setSmsNotifications(!smsNotifications)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    In-App Notifications
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive notifications within the app
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppNotifications}
                  onChange={() => setInAppNotifications(!inAppNotifications)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t dark:border-gray-700">
          <button
            onClick={handleProfileUpdate}
            className={`px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center ${
              isUpdating ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving..." : "Save Notification Preferences"}
          </button>
        </div>
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "personal":
        return renderPersonalInfoSection();
      case "financial":
        return renderFinancialProfileSection();
      case "kyc":
        return renderKycSection();
      case "security":
        return renderSecuritySection();
      case "notifications":
        return renderNotificationsSection();
      default:
        return renderPersonalInfoSection();
    }
  };

  return (
    <div className="px-2 max-sm:px-6 max-lg:px-8 py-4">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sticky top-24">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Profile Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your account preferences
              </p>
            </div>

            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.section}
                  onClick={() => setActiveSection(item.section)}
                  className={`h-12 flex items-center px-3 py-2 w-full text-left rounded-lg transition-colors ${
                    activeSection === item.section
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 mr-3 ${
                      activeSection === item.section
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => signOut()}
                className="h-12 flex items-center px-3 py-2 w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3 text-gray-400" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderActiveSection()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
