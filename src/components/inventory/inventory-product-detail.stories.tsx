import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn } from 'storybook/test';
import { INVENTORY_PRODUCTS } from '@/lib/inventory-control-data';
import { InventoryProductDetail } from './inventory-product-detail';

const meta = {
  component: InventoryProductDetail,
  tags: ['ai-generated'],
  args: {
    product: INVENTORY_PRODUCTS[0],
    initialSkuId: INVENTORY_PRODUCTS[0].skus[0].id,
    onClose: fn(),
  },
  parameters: {
    nextjs: { navigation: { pathname: '/inventory/all' } },
  },
} satisfies Meta<typeof InventoryProductDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LunchboxSku: Story = {
  play: async ({ canvas, userEvent }) => {
    const expandButton = canvas.getByRole('button', { name: '펼쳐보기' });
    await userEvent.click(expandButton);
    await expect(canvas.getByRole('button', { name: '접기' })).toBeVisible();
  },
};

export const SaladSku: Story = {
  args: {
    product: INVENTORY_PRODUCTS[1],
    initialSkuId: INVENTORY_PRODUCTS[1].skus[0].id,
  },
};
