import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const data = [
  { month: 'Jan', gain: 800, loss: 0 },
  { month: 'Jan', gain: 1200, loss: 0 },
  { month: 'Jan', gain: 3500, loss: 0 },
  { month: 'Jan', gain: 8500, loss: 0 },
  { month: 'Jan', gain: 0, loss: 7200 },
  { month: 'Feb', gain: 6800, loss: 0 },
  { month: 'Feb', gain: 0, loss: 6500 },
  { month: 'Feb', gain: 9500, loss: 0 },
  { month: 'Feb', gain: 11500, loss: 0 },
  { month: 'Mar', gain: 13000, loss: 0 },
];

export function ProfitChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Profit Performance</h3>
            <p className="text-xs text-muted-foreground">All-time profit chart</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-loss" />
            <span className="text-xs text-muted-foreground">Loss</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(1)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
            />
            <Bar dataKey="gain" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-gain-${index}`} 
                  fill={entry.gain > 0 ? 'hsl(var(--success))' : 'transparent'} 
                />
              ))}
            </Bar>
            <Bar dataKey="loss" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-loss-${index}`} 
                  fill={entry.loss > 0 ? 'hsl(var(--loss))' : 'transparent'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
