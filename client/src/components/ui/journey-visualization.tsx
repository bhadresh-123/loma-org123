import { motion } from "framer-motion";
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { BuildingOffice2Icon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Building2,
    title: "About You",
    time: "2-3 min",
    items: ["Contact info", "Professional details", "Location"]
  },
  {
    icon: FileText,
    title: "Your Practice",
    time: "3-4 min",
    items: ["Licensing", "Practice format", "Service areas"]
  },
  {
    icon: Briefcase,
    title: "Business Setup",
    time: "4-5 min",
    items: ["Structure", "Location", "Costs"]
  }
];

export function JourneyVisualization() {
  return (
    <div className="w-full max-w-5xl mx-auto py-12">
      <motion.h2 
        className="text-3xl font-bold text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Let's Get Your Practice Started
      </motion.h2>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <Card className="relative h-full bg-gradient-to-br from-white to-gray-50 border-2 hover:border-primary transition-colors">
              <CardContent className="pt-12">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <div className="bg-primary rounded-2xl p-4 shadow-lg">
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <div className="text-sm text-muted-foreground">
                    {step.time}
                  </div>
                  <ul className="space-y-2">
                    {step.items.map((item, itemIndex) => (
                      <motion.li
                        key={itemIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 + itemIndex * 0.1 }}
                        className="text-sm flex items-center justify-center gap-2"
                      >
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}