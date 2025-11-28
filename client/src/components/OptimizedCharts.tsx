
import React, { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load recharts to improve initial bundle size
const RechartLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const RechartLine = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const RechartXAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const RechartYAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const RechartCartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const RechartTooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const RechartResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const RechartBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const RechartBar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const RechartPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const RechartPie = lazy(() => import('recharts').then(module => ({ default: module.Pie })));
const RechartCell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));

const ChartLoader = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

// Wrapper components with suspense
export const LineChart = (props) => (
  <Suspense fallback={<ChartLoader />}>
    <RechartLineChart {...props} />
  </Suspense>
);

export const Line = (props) => (
  <Suspense fallback={null}>
    <RechartLine {...props} />
  </Suspense>
);

export const XAxis = (props) => (
  <Suspense fallback={null}>
    <RechartXAxis {...props} />
  </Suspense>
);

export const YAxis = (props) => (
  <Suspense fallback={null}>
    <RechartYAxis {...props} />
  </Suspense>
);

export const CartesianGrid = (props) => (
  <Suspense fallback={null}>
    <RechartCartesianGrid {...props} />
  </Suspense>
);

export const Tooltip = (props) => (
  <Suspense fallback={null}>
    <RechartTooltip {...props} />
  </Suspense>
);

export const ResponsiveContainer = (props) => (
  <Suspense fallback={<ChartLoader />}>
    <RechartResponsiveContainer {...props} />
  </Suspense>
);

export const BarChart = (props) => (
  <Suspense fallback={<ChartLoader />}>
    <RechartBarChart {...props} />
  </Suspense>
);

export const Bar = (props) => (
  <Suspense fallback={null}>
    <RechartBar {...props} />
  </Suspense>
);

export const PieChart = (props) => (
  <Suspense fallback={<ChartLoader />}>
    <RechartPieChart {...props} />
  </Suspense>
);

export const Pie = (props) => (
  <Suspense fallback={null}>
    <RechartPie {...props} />
  </Suspense>
);

export const Cell = (props) => (
  <Suspense fallback={null}>
    <RechartCell {...props} />
  </Suspense>
);
