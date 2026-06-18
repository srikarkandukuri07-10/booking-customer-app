import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MenuItem, CartItem, OrderPayload } from "@/types";
import { submitOrderToBackend } from "@/lib/api";

interface CustomerOrderStore {
  selectedTable: string | null;
  customerName: string | null;
  cart: CartItem[];
  orders: OrderPayload[];
  isSubmitting: boolean;
  submitError: string | null;
  lastCustomerName: string | null;
  lastSelectedTable: string | null;
  setTable: (table: string | null) => void;
  setCustomerName: (name: string | null) => void;
  setLastCustomerName: (name: string | null) => void;
  setLastSelectedTable: (table: string | null) => void;
  addToCart: (item: MenuItem, quantity: number, customInstructions: string) => void;
  removeFromCart: (itemId: string, customInstructions: string) => void;
  updateQuantity: (itemId: string, customInstructions: string, quantity: number) => void;
  clearCart: () => void;
  submitOrder: () => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

export const useCustomerOrderStore = create<CustomerOrderStore>()(
  persist(
    (set, get) => ({
      selectedTable: null,
      customerName: null,
      cart: [],
      orders: [],
      isSubmitting: false,
      submitError: null,
      lastCustomerName: null,
      lastSelectedTable: null,

      setTable: (table) => set({ selectedTable: table }),
      setCustomerName: (name) => set({ customerName: name }),
      setLastCustomerName: (name) => set({ lastCustomerName: name }),
      setLastSelectedTable: (table) => set({ lastSelectedTable: table }),

      addToCart: (item, quantity, customInstructions) => set((state) => {
        const existingItemIndex = state.cart.findIndex(
          (cartItem) => 
            cartItem.item.id === item.id && 
            cartItem.customInstructions === customInstructions
        );

        const newCart = [...state.cart];

        if (existingItemIndex > -1) {
          // If item with exact same instructions exists, merge quantity
          newCart[existingItemIndex] = {
            ...newCart[existingItemIndex],
            quantity: newCart[existingItemIndex].quantity + quantity
          };
        } else {
          // Add new cart entry
          newCart.push({
            item,
            quantity,
            customInstructions
          });
        }

        return { cart: newCart };
      }),

      removeFromCart: (itemId, customInstructions) => set((state) => ({
        cart: state.cart.filter(
          (cartItem) => 
            !(cartItem.item.id === itemId && cartItem.customInstructions === customInstructions)
        )
      })),

      updateQuantity: (itemId, customInstructions, quantity) => set((state) => {
        if (quantity <= 0) {
          return {
            cart: state.cart.filter(
              (cartItem) => 
                !(cartItem.item.id === itemId && cartItem.customInstructions === customInstructions)
            )
          };
        }

        return {
          cart: state.cart.map((cartItem) => 
            (cartItem.item.id === itemId && cartItem.customInstructions === customInstructions)
              ? { ...cartItem, quantity }
              : cartItem
          )
        };
      }),

      clearCart: () => set({ cart: [] }),

      submitOrder: async () => {
        const { selectedTable, customerName, cart } = get();
        if (cart.length === 0 || !selectedTable || !customerName) {
          return { success: false, error: "Cart is empty, table not selected, or name missing." };
        }

        set({ isSubmitting: true, submitError: null });

        const totalAmount = cart.reduce(
          (total, cartItem) => total + cartItem.item.price * cartItem.quantity,
          0
        );

        // Format table with customer name so waiters can verify it easily!
        const tableWithCustomer = `${selectedTable} (${customerName})`;

        try {
          // Send request to the physical admin backend APIs
          const response = await submitOrderToBackend(tableWithCustomer, cart, totalAmount);
          
          if (response.success) {
            const orderId = (response as any).order?.id || response.orderId || `ord_${Date.now()}`;
            const orderStatus = (response as any).order?.status || "PENDING";

            
            // Append placed order to simulated local order history for UI feedback
            const placedOrder: OrderPayload = {
              id: orderId,
              tableNumber: selectedTable,
              items: [...cart],
              totalAmount,
              timestamp: new Date().toISOString(),
              status: orderStatus,
            };

            set((state) => ({
              orders: [placedOrder, ...state.orders],
              cart: [], // Empty cart upon successful backend confirmation
              isSubmitting: false,
              submitError: null
            }));

            return { success: true, orderId };
          } else {
            const errMsg = response.message || "The kitchen was unable to receive this order.";
            set({ isSubmitting: false, submitError: errMsg });
            return { success: false, error: errMsg };
          }
        } catch (error: any) {
          const errMsg = error?.message || "Unable to reach the kitchen server. Please check connection.";
          set({ isSubmitting: false, submitError: errMsg });
          return { success: false, error: errMsg };
        }
      }
    }),
    {
      name: "restaurant-ordering-storage",
      partialize: (state) => ({
        cart: state.cart,
        orders: state.orders,
        lastCustomerName: state.lastCustomerName,
        lastSelectedTable: state.lastSelectedTable
      })
    }
  )
);
