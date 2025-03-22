"use client";

import { useGlobalState } from "@/context/GlobalContext";
import { useLanguage } from "@/context/LanguageContext";
import { sidebarData } from "@/constants/sidebarData";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/public/images";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useNextStep } from "nextstepjs";
import { CircleHelp, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const Sidebar = () => {
  const { sidebarState } = useGlobalState();
  const { currentLang, dict } = useLanguage();
  const { user, isLoaded } = useUser();
  const { startNextStep } = useNextStep();
  const pathname = usePathname();

  const handleStartTour = () => {
    startNextStep("mainTour");
  };

  const isActiveRoute = (route) => {
    return pathname.includes(`/${currentLang}${route}`);
  };

  return (
    <div className="relative h-screen max-md:hidden">
      <div
        className={`absolute inset-0 bg-gradient-to-br from-primary-700/90 to-primary-900/90 dark:from-dark-primary-500/90 dark:to-dark-primary-700/90 opacity-60 blur-lg -z-10 transition-all duration-300 ease-in-out ${
          sidebarState ? "w-[280px]" : "w-20"
        }`}
      />

      <div
        className={`h-screen flex flex-col justify-between py-6 dark:bg-black/40 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          sidebarState ? "w-[280px] px-4" : "w-20 px-2"
        } shadow-lg border-r border-secondary-300/30 dark:border-dark-secondary-100/10`}
      >
        <div className="flex flex-col justify-start items-start">
          <div
            className="flex justify-between items-center w-full mb-5"
            id="step1"
          >
            <div className="flex items-center gap-3">
              {sidebarState && <Image src={Logo} className="h-10 w-auto" />}
            </div>
          </div>

          <nav className="w-full">
            {sidebarData.map((category, index) => (
              <div key={index} className="mb-2">
                {sidebarState && (
                  <p className="text-md font-bold text-primary-900 dark:text-gray-400 uppercase mb-1">
                    {dict?.sidebar?.[category.category] || category.category}
                  </p>
                )}
                <ul className="space-y-1">
                  {category.items.map((item, itemIndex) => {
                    const isActive = isActiveRoute(item.route);
                    return (
                      <li
                        key={itemIndex}
                        id={`${item.title === "chatbot" ? "amigo" : ""}`}
                      >
                        <Link
                          href={`/${currentLang}${item.route}`}
                          className={`flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 ${
                            sidebarState ? "px-3" : "justify-center px-0"
                          } ${
                            isActive
                              ? "bg-primary-500/20 text-primary-100 dark:bg-dark-primary-500/20 dark:text-dark-primary-300"
                              : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span
                            className={`${
                              sidebarState ? "text-2xl" : "text-2xl"
                            }`}
                          >
                            <item.icon
                              className={
                                isActive
                                  ? "stroke-primary-300 dark:stroke-dark-primary-300"
                                  : ""
                              }
                            />
                          </span>
                          {sidebarState && (
                            <span className="text-lg font-medium">
                              {dict?.sidebar?.[item.title]}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {!isLoaded ? (
          <div className="w-full h-20 flex justify-center items-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center gap-y-4">
            <div
              className={`flex w-full ${
                sidebarState ? "justify-start" : "justify-center"
              } items-center p-1 rounded-lg`}
            >
              <UserButton
                afterSignOutUrl={`/${currentLang}`}
                appearance={{
                  elements: {
                    userButtonAvatarBox: { height: "40px", width: "40px" },
                    userButtonBox: {
                      width: sidebarState ? "auto" : "40px",
                    },
                  },
                }}
              />

              {sidebarState && (
                <div className="flex flex-col justify-center items-start ml-3 overflow-hidden">
                  <h1 className="text-gray-100 font-semibold truncate max-w-[150px]">
                    {user?.fullName || "User"}
                  </h1>
                  <h3 className="text-[0.8rem] text-slate-600 dark:text-gray-400 -mt-0.5 font-medium truncate max-w-[175pspx]">
                    {user?.primaryEmailAddress?.emailAddress || "User email"}
                  </h3>
                </div>
              )}
            </div>
            <Button
              className={`h-10 ${
                sidebarState ? "w-full" : "w-14 aspect-square p-0"
              } bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 dark:from-dark-primary-600 dark:to-dark-primary-500 dark:hover:from-dark-primary-700 dark:hover:to-dark-primary-600 border-0 text-white shadow-md transition-all duration-300`}
              onClick={handleStartTour}
            >
              <CircleHelp
                className={`${sidebarState ? "mr-2 size-4" : "size-5"}`}
              />
              {sidebarState && (
                <span className="text-sm font-medium">Start Tour</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
