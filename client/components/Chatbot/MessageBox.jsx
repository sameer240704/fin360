import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/public/images";

const MessageBox = ({ message }) => {
  const formatMessage = (text) => {
    if (!text) return null;

    const bulletPointRegex = /^[*-]\s(.+)/gm;
    const numberedListRegex = /^(\d+\.\s)(.+)/gm;

    const sectionHeaderRegex = /\*\*(.*?):\*\*/g;

    if (
      text.includes("**LATEST STOCK PRICE:**") ||
      text.includes("**PRICE CHANGES:**") ||
      text.includes("**ROI") ||
      text.includes("FinGraph")
    ) {
      // Split the message by section headers
      const sections = [];
      let lastIndex = 0;
      let match;

      // Create a copy of the text to work with
      let textCopy = text;

      // Extract any title/intro before the first section
      const introEndIndex = textCopy.indexOf("**");
      if (introEndIndex > 0) {
        const intro = textCopy.substring(0, introEndIndex).trim();
        sections.push({
          title: "INTRO",
          content: intro,
        });
      }

      // Find all sections
      while ((match = sectionHeaderRegex.exec(text)) !== null) {
        const sectionTitle = match[1].trim();
        const startIndex = match.index + match[0].length;

        // Find the next section header or end of text
        const nextMatch = sectionHeaderRegex.exec(text);
        const endIndex = nextMatch ? nextMatch.index : text.length;

        // Extract content between this header and next header
        const sectionContent = text.substring(startIndex, endIndex).trim();

        // Add to sections array
        sections.push({
          title: sectionTitle,
          content: sectionContent,
        });

        // Reset regex lastIndex to continue from where we found the match
        if (nextMatch) {
          sectionHeaderRegex.lastIndex = 0;
          lastIndex = endIndex;
        }
      }

      // If no sections were found, just use the original text
      if (sections.length === 0) {
        return (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-bold text-lg text-limeGreen-900 leading-relaxed whitespace-pre-line tracking-wide p-2 rounded-lg"
          >
            {text}
          </motion.p>
        );
      }

      // Render the financial sections
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {sections.map((section, index) => {
            // Special handling for intro section (no title)
            if (section.title === "INTRO") {
              return (
                <motion.div
                  key={`intro-${index}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-primary-900/20 p-4 rounded-lg border-l-4 border-primary-500"
                >
                  <p className="text-white text-lg font-medium">
                    {section.content}
                  </p>
                </motion.div>
              );
            }

            // Special handling for price information
            if (
              section.title.includes("PRICE") ||
              section.title.includes("STOCK")
            ) {
              // Check if there are bullet points in this section
              if (section.content.includes("*")) {
                const listItems = section.content
                  .split("*")
                  .filter((item) => item.trim().length > 0);

                return (
                  <motion.div
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-blue-900/20 p-4 rounded-lg"
                  >
                    <h3 className="text-blue-300 font-bold text-xl mb-3">
                      {section.title}
                    </h3>
                    <ul className="space-y-2">
                      {listItems.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-white"
                        >
                          <span className="text-blue-400">•</span>
                          <span>{item.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              } else {
                // Regular price section
                return (
                  <motion.div
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-blue-900/20 p-4 rounded-lg"
                  >
                    <h3 className="text-blue-300 font-bold text-xl mb-3">
                      {section.title}
                    </h3>
                    <p className="text-white">{section.content}</p>
                  </motion.div>
                );
              }
            }

            // Special handling for ROI sections
            else if (
              section.title.includes("ROI") ||
              section.title.includes("RETURN")
            ) {
              return (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-green-900/20 p-4 rounded-lg"
                >
                  <h3 className="text-green-300 font-bold text-xl mb-3">
                    {section.title}
                  </h3>
                  <p className="text-white">{section.content}</p>
                </motion.div>
              );
            }

            // Special handling for RISKS or WARNING sections
            else if (
              section.title.includes("RISK") ||
              section.title.includes("WARNING")
            ) {
              return (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500"
                >
                  <h3 className="text-red-300 font-bold text-xl mb-3">
                    {section.title}
                  </h3>
                  <p className="text-white">{section.content}</p>
                </motion.div>
              );
            }

            // Special handling for INSIGHTS sections
            else if (
              section.title.includes("INSIGHT") ||
              section.title.includes("OVERVIEW") ||
              section.title.includes("ANALYSIS")
            ) {
              return (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-primary-900/20 p-4 rounded-lg"
                >
                  <h3 className="text-primary-300 font-bold text-xl mb-3">
                    {section.title}
                  </h3>
                  <p className="text-white">{section.content}</p>
                </motion.div>
              );
            }

            // Default section styling
            return (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/40 p-4 rounded-lg"
              >
                <h3 className="text-gray-300 font-bold text-xl mb-3">
                  {section.title}
                </h3>
                <p className="text-white">{section.content}</p>
              </motion.div>
            );
          })}
        </motion.div>
      );
    }

    // Original game content handling
    if (text.includes("🎮")) {
      const gameLines = text.split("\n").filter((line) => line.includes("🎮"));

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {gameLines.map((line, index) => {
            const parts = line.split("🎮");
            const gameName = parts[0].replace(/[•\s]/g, "").trim();
            const gameDescription = parts[1]?.trim() || "";

            return (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="group"
              >
                <Card className="bg-primary-800 border-primary-500 hover:bg-primary-900 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary-500/20 text-primary-100 px-3 py-1 text-xl"
                      >
                        {gameName}
                      </Badge>
                      <span className="text-xl group-hover:rotate-12 transition-transform">
                        🎮
                      </span>
                    </div>
                    <p className="text-limeGreen-300 text-md">
                      {gameDescription}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      );
    }

    // Original bullet points handling
    const bulletPoints = text.matchAll(bulletPointRegex);
    const numberedLists = text.matchAll(numberedListRegex);

    if (Array.from(text.matchAll(bulletPointRegex)).length > 0) {
      const points = Array.from(bulletPoints, (match) => match[1]);
      return (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="space-y-3"
        >
          {points.map((point, index) => (
            <motion.li
              key={index}
              variants={{
                hidden: { x: -20, opacity: 0 },
                visible: { x: 0, opacity: 1 },
              }}
              className="flex gap-2 text-primary-600 hover:bg-white/10 p-3 rounded-lg transition-all"
            >
              <span className="text-primary-500">•</span>
              <span>{point.trim()}</span>
            </motion.li>
          ))}
        </motion.ul>
      );
    } else if (Array.from(text.matchAll(numberedListRegex)).length > 0) {
      const points = Array.from(numberedLists, (match) => match[2]);
      return (
        <motion.ol
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="space-y-3"
        >
          {points.map((point, index) => (
            <motion.li
              key={index}
              variants={{
                hidden: { x: -20, opacity: 0 },
                visible: { x: 0, opacity: 1 },
              }}
              className="flex gap-2 text-white hover:bg-white/10 p-3 rounded-lg transition-all"
            >
              <Badge
                variant="outline"
                className="h-6 w-6 flex items-center justify-center"
              >
                {index + 1}
              </Badge>
              <span>{point.trim()}</span>
            </motion.li>
          ))}
        </motion.ol>
      );
    }

    return (
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-lg text-limeGreen-900 leading-relaxed whitespace-pre-line tracking-wide hover:text-primary-700 transition-colors duration-300 p-2 rounded-lg hover:bg-primary-500/5"
      >
        {text}
      </motion.p>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="z-10 h-[750px] w-[680px]"
    >
      <Card className="h-full bg-gradient-to-tr from-slate-700/30 via-gray-800/30 to-slate-700-500/30 backdrop-blur-md border-white/10">
        {message === "" ? (
          <div className="h-full w-full flex justify-center items-center">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Image src={Logo} alt="amigo.ai" className="h-20 w-auto" />
            </motion.div>
          </div>
        ) : (
          <ScrollArea className="h-full w-full p-6 rounded-lg">
            {formatMessage(message)}
          </ScrollArea>
        )}
      </Card>
    </motion.div>
  );
};

export default MessageBox;
