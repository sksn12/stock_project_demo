import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { Header } from './header';

const meta = {
  component: Header,
  tags: ['ai-generated'],
  args: {
    isSidebarOpen: true,
    onToggleSidebar: fn(),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InventoryExpanded: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '사이드바 접기' })).toHaveAttribute('aria-expanded', 'true');
  },
};

export const StrategyCollapsed: Story = {
  args: { isSidebarOpen: false },
  parameters: { nextjs: { navigation: { pathname: '/strategy/history' } } },
};

export const InventoryUserContext: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('김영만 수석 MD')).toBeVisible();
    await expect(canvas.getByText('현대그린푸드 재고운영')).toBeVisible();
  },
};
