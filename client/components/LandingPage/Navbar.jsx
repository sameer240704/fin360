import React, { forwardRef } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ThemeToggle } from "../Misc/ThemeToggle";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";
import { Logo } from "@/public/images";

const investmentProducts = [
  {
    title: "Stocks & ETFs",
    href: "/investment/stocks",
    description:
      "Trade individual stocks and exchange-traded funds with low fees.",
  },
  {
    title: "Mutual Funds",
    href: "/investment/mutual-funds",
    description: "Diversify your portfolio with our selection of mutual funds.",
  },
  {
    title: "Retirement",
    href: "/investment/retirement",
    description: "Plan for your future with IRA, 401(k) and pension options.",
  },
  {
    title: "Robo-Advisor",
    href: "/investment/robo-advisor",
    description:
      "Automated investing with advanced algorithms and low management fees.",
  },
];

const bankingServices = [
  {
    title: "Checking Accounts",
    href: "/banking/checking",
    description: "No-fee checking accounts with competitive interest rates.",
  },
  {
    title: "Savings Solutions",
    href: "/banking/savings",
    description: "High-yield savings accounts to help grow your money.",
  },
  {
    title: "Loans & Mortgages",
    href: "/banking/loans",
    description:
      "Competitive rates on personal loans, mortgages, and refinancing.",
  },
  {
    title: "Credit Cards",
    href: "/banking/credit-cards",
    description:
      "Rewards cards with cashback, travel benefits, and low APR options.",
  },
];

const learningResources = [
  {
    title: "Investment Basics",
    href: "/learn/investment-basics",
    description: "Learn the fundamentals of investing and building wealth.",
  },
  {
    title: "Market News",
    href: "/learn/market-news",
    description: "Stay updated with the latest financial market developments.",
  },
  {
    title: "Retirement Planning",
    href: "/learn/retirement",
    description: "Strategies and calculators to plan for a secure retirement.",
  },
  {
    title: "Tax Strategies",
    href: "/learn/tax-strategies",
    description: "Optimize your investments with tax-efficient approaches.",
  },
];

const ListItem = forwardRef(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const Navbar = ({ isScrolled }) => {
  const { currentLang } = useLanguage();

  return (
    <header
      className={`w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "fixed top-0 bg-background shadow-md"
          : "relative bg-dark-secondary-500 dark:bg-dark-secondary-400"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="font-bold text-xl flex items-center">
            <span
              className={`text-xl font-bold ${
                isScrolled
                  ? "text-foreground"
                  : "text-secondary-100 dark:text-dark-primary-400"
              }`}
            >
              <Image alt="Logo" src={Logo} className="h-10 w-auto" />
            </span>
          </div>

          <nav className="ml-8 hidden md:flex">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={
                      isScrolled
                        ? "text-foreground"
                        : "font-bold text-secondary-500 hover:dark:text-dark-primary-300 bg-transparent hover:bg-transparent hover:text-primary-400 dark:hover:text-dark-primary-400"
                    }
                  >
                    Invest
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {investmentProducts.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          href={item.href}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={
                      isScrolled
                        ? "text-foreground"
                        : "font-bold text-secondary-500 hover:dark:text-dark-primary-300 bg-transparent hover:bg-transparent hover:text-primary-400 dark:hover:text-dark-primary-400"
                    }
                  >
                    Banking
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {bankingServices.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          href={item.href}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger
                    className={
                      isScrolled
                        ? "text-foreground"
                        : "font-bold text-secondary-500 hover:dark:text-dark-primary-300 bg-transparent hover:bg-transparent hover:text-primary-400 dark:hover:text-dark-primary-400"
                    }
                  >
                    Learn
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {learningResources.map((item) => (
                        <ListItem
                          key={item.title}
                          title={item.title}
                          href={item.href}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link href="/about" legacyBehavior passHref>
                    <NavigationMenuLink
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isScrolled
                          ? "text-foreground"
                          : "font-bold text-secondary-500 bg-transparent hover:bg-transparent hover:text-primary-400"
                      )}
                    >
                      About Us
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link
            href={`/${currentLang}/sign-in`}
            className={`text-sm font-medium ${
              isScrolled
                ? "text-foreground"
                : "text-secondary-100 dark:text-dark-primary-200"
            } hover:opacity-80`}
          >
            Log In
          </Link>
          <Button className="bg-primary-500 dark:bg-dark-primary-600 hover:bg-primary-600 dark:hover:bg-dark-primary-700 text-secondary-100 dark:text-dark-secondary-100 rounded-full px-4 py-2">
            Open an Account
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
