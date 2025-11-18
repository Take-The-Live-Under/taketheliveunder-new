import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ModelComparisonChartProps {
  pomeroyPrediction: number;
  mlPrediction: number;
  finalPrediction: number;
  modelAgreement: number;
}

export default function ModelComparisonChart({
  pomeroyPrediction,
  mlPrediction,
  finalPrediction,
  modelAgreement
}: ModelComparisonChartProps) {
  const data = [
    {
      name: 'Pomeroy\n(60%)',
      value: pomeroyPrediction,
      fill: '#3b82f6' // blue-500
    },
    {
      name: 'ML Model\n(40%)',
      value: mlPrediction,
      fill: '#a855f7' // purple-500
    },
    {
      name: 'Final\nEnsemble',
      value: finalPrediction,
      fill: '#14b8a6' // teal-500
    }
  ];

  const agreementColor = modelAgreement < 3 ? '#10b981' : modelAgreement < 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
        Model Predictions
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#4b5563' }}
            label={{ value: 'Projected Total', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              color: '#f3f4f6'
            }}
            formatter={(value: number) => [value.toFixed(1), 'Points']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 text-center">
        <span className="text-xs text-deep-slate-500">Agreement: </span>
        <span className="text-xs font-bold" style={{ color: agreementColor }}>
          ±{modelAgreement.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
