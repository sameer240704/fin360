import { BriefcaseBusiness, LayoutDashboard, Workflow, BotMessageSquare, Newspaper, CircleUserRound, FileChartPie, ClipboardMinus, ChartCandlestick, ChartNoAxesCombined, Star } from 'lucide-react';

export const sidebarData = [
    {
        category: "dashboard",
        items: [
            { title: "overview", route: "/overview", icon: LayoutDashboard },
            { title: "my-portfolio", route: "/my-portfolio", icon: BriefcaseBusiness },
            { title: "stock-analyzer", route: "/stock-analyzer", icon: ChartCandlestick },
            { title: "asset-growth-calc", route: "/asset-growth-calc", icon: ChartNoAxesCombined },
            { title: "recommendations", route: "/recommendations", icon: Star },
        ],
    },
    {
        category: "market",
        items: [
            { title: "news", route: "/user/news", icon: Newspaper },
            { title: "reports", route: "/user/reports", icon: ClipboardMinus },
            { title: "flow", route: "/user/flow", icon: Workflow },
        ],
    },
    {
        category: "Communication",
        items: [
            { title: "chatbot", route: "/chatbot", icon: BotMessageSquare },
        ],
    },
    {
        category: "user",
        items: [
            { title: "profile", route: "/user/profile", icon: CircleUserRound },
            { title: "analysis", route: "/user/analysis", icon: FileChartPie },
        ],
    },
];
