import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import { CenterInventoryMap } from './center-inventory-map';

const meta = {
  component: CenterInventoryMap,
  tags: ['ai-generated'],
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
} satisfies Meta<typeof CenterInventoryMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AvailableInventory: Story = {};

export const BalanceModeInteraction: Story = {
  play: async ({ canvas, userEvent }) => {
    const balanceButton = canvas.getByRole('button', { name: '재고 균형' });
    await userEvent.click(balanceButton);
    await expect(balanceButton).toHaveAttribute('aria-pressed', 'true');
  },
};
