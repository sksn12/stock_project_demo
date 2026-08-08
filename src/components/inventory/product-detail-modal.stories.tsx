import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { MOCK_INVENTORY_ITEMS } from '@/lib/mock-data';
import { ProductDetailModal } from './product-detail-modal';

const meta = {
  component: ProductDetailModal,
  tags: ['ai-generated'],
  args: {
    item: MOCK_INVENTORY_ITEMS[0],
    onClose: fn(),
    onProceedStrategy: fn(),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof ProductDetailModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Operations: Story = {};

export const RiskAnalysis: Story = {
  args: { initialMode: 'RISK_ANALYSIS' },
};

export const StrategyHistory: Story = {
  args: { initialMode: 'HISTORY' },
};
