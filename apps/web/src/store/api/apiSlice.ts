import { BaseQueryFn, createApi, FetchArgs, fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { logout, setCredentials } from '../authSlice';

// Relativa por defecto: el navegador siempre llama al mismo host/puerto desde el que
// cargó la página (funciona igual en localhost, en la IP de la LAN desde el celular, o
// detrás de un dominio real más adelante). next.config.js reescribe /api/* hacia el
// backend. NEXT_PUBLIC_API_URL sigue disponible para forzar una URL absoluta si hace falta.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const data = refreshResult.data as { user: any; accessToken: string; refreshToken: string };
        api.dispatch(setCredentials(data));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  category: Category;
  providerId?: string | null;
  price: number;
  // Solo vienen en rutas autenticadas (GET /products/:id/manage, /products/mine,
  // create, update) — las rutas públicas (catálogo) nunca exponen costo/margen.
  cost?: number;
  margin?: number;
  marginPercentage?: number;
  stock: number;
  lowStockThreshold: number;
  leadTimeDays: number;
  restockDate?: string;
  sizes: string[];
  colors: string[];
  material?: string;
  images: string[];
  video360Url?: string;
  isActive: boolean;
}

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface ProviderProfile {
  id: string;
  userId: string;
  businessName: string;
  taxId: string;
  phone: string;
  city: string;
  description?: string;
  status: ProviderStatus;
  rejectionReason?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  stockAfter: number;
  reason?: string;
  createdAt: string;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'failed' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  providerId?: string | null;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  order?: Order;
}

export interface BodyProfile {
  id: string;
  userId: string;
  heightCm: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderWidthCm: number;
  armLengthCm: number;
  source: string;
  measuredAt: string;
}

export interface SizeRecommendationAlternative {
  size: string;
  compatibilityPercent: number;
  fit: string;
}

export interface SizeRecommendation {
  recommendedSize: string;
  compatibilityPercent: number;
  fit: string;
  returnRisk: 'low' | 'medium' | 'high';
  garmentType: string;
  stylePreference: 'comfort' | 'regular' | 'slim';
  profileUsed: {
    bustCm: number;
    waistCm: number;
    hipsCm: number;
    shoulderWidthCm?: number;
    armLengthCm?: number;
    heightCm?: number;
  };
  alternatives: SizeRecommendationAlternative[];
  message: string;
  product?: {
    id: string;
    sku: string;
    name: string;
  };
}

export interface TopSellingProduct {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface RestockAlert {
  productId: string;
  sku: string;
  name: string;
  stock: number;
  dailyVelocity: number;
  daysOfStockLeft: number;
  leadTimeDays: number;
}

export interface CategoryDemand {
  categoryId: string;
  categoryName: string;
  activeProducts: number;
  unitsSold: number;
  demandPerProduct: number;
}

export interface TrendItem {
  label: string;
  score: number;
}

export interface TrendsSnapshot {
  generatedAt: string;
  source: 'example-data' | 'google-trends';
  disclaimer: string;
  colors: TrendItem[];
  styles: TrendItem[];
  hashtags: TrendItem[];
}

export interface GeneratedPost {
  productId: string;
  caption: string;
  hashtags: string[];
  suggestedPlatforms: string[];
  source: 'template-generator' | 'openai';
  disclaimer: string;
}

export interface ChatbotProductSuggestion {
  id: string;
  sku: string;
  name: string;
  price: number;
  images: string[];
}

export interface ChatbotReply {
  reply: string;
  products: ChatbotProductSuggestion[];
  source: 'rule-based' | 'openai';
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  paymentReference?: string | null;
  paidAt?: string | null;
  items: OrderItem[];
  createdAt: string;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Product', 'Category', 'Inventory', 'Provider', 'Order', 'BodyProfile'],
  endpoints: (builder) => ({
    register: builder.mutation<
      { user: any; accessToken: string; refreshToken: string },
      { fullName: string; email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: builder.mutation<
      { user: any; accessToken: string; refreshToken: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, { name: string; description?: string }>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Category'],
    }),

    getProducts: builder.query<
      PaginatedProducts,
      { categoryId?: string; search?: string; lowStock?: boolean; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: '/products', params: params ?? {} }),
      providesTags: ['Product'],
    }),
    getMyProducts: builder.query<
      PaginatedProducts,
      { search?: string; lowStock?: boolean; includeInactive?: boolean; page?: number; limit?: number } | void
    >({
      query: (params) => ({ url: '/products/mine', params: params ?? {} }),
      providesTags: ['Product'],
    }),
    getProduct: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    // Autenticado (ADMIN o el PROVIDER dueño) — a diferencia de getProduct, sí trae
    // cost/margin/marginPercentage. Úsese en pantallas de edición, no en el catálogo.
    getProductForManagement: builder.query<Product, string>({
      query: (id) => `/products/${id}/manage`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<Product, Partial<Product>>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string; body: Partial<Product> }>({
      query: ({ id, body }) => ({ url: `/products/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Product'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    uploadImage: builder.mutation<{ url: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/uploads/image', method: 'POST', body: formData };
      },
    }),

    adjustStock: builder.mutation<
      InventoryMovement,
      { productId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; reason?: string }
    >({
      query: (body) => ({ url: '/inventory/movements', method: 'POST', body }),
      invalidatesTags: ['Product', 'Inventory'],
    }),
    getLowStockAlerts: builder.query<Product[], void>({
      query: () => '/inventory/alerts/low-stock',
      providesTags: ['Inventory'],
    }),
    getProductMovements: builder.query<InventoryMovement[], string>({
      query: (productId) => `/inventory/products/${productId}/movements`,
      providesTags: ['Inventory'],
    }),

    applyProvider: builder.mutation<
      ProviderProfile,
      { businessName: string; taxId: string; phone: string; city: string; description?: string }
    >({
      query: (body) => ({ url: '/providers/apply', method: 'POST', body }),
      invalidatesTags: ['Provider'],
    }),
    getMyProviderProfile: builder.query<ProviderProfile, void>({
      query: () => '/providers/me',
      providesTags: ['Provider'],
    }),
    getProviders: builder.query<ProviderProfile[], { status?: ProviderStatus } | void>({
      query: (params) => ({ url: '/providers', params: params ?? {} }),
      providesTags: ['Provider'],
    }),
    approveProvider: builder.mutation<ProviderProfile, string>({
      query: (id) => ({ url: `/providers/${id}/approve`, method: 'PATCH' }),
      invalidatesTags: ['Provider'],
    }),
    rejectProvider: builder.mutation<ProviderProfile, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({ url: `/providers/${id}/reject`, method: 'PATCH', body: { reason } }),
      invalidatesTags: ['Provider'],
    }),

    createOrder: builder.mutation<
      Order,
      {
        items: { productId: string; quantity: number }[];
        shippingFullName: string;
        shippingPhone: string;
        shippingAddress: string;
        shippingCity: string;
      }
    >({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: ['Order', 'Product'],
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => '/orders/mine',
      providesTags: ['Order'],
    }),
    getOrder: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    getAllOrders: builder.query<Order[], { status?: OrderStatus } | void>({
      query: (params) => ({ url: '/orders', params: params ?? {} }),
      providesTags: ['Order'],
    }),
    getProviderOrderItems: builder.query<OrderItem[], void>({
      query: () => '/orders/provider/items',
      providesTags: ['Order'],
    }),
    getCheckoutLink: builder.query<{ checkoutUrl: string }, string>({
      query: (orderId) => `/payments/wompi/checkout-link/${orderId}`,
    }),
    simulatePayment: builder.mutation<void, { orderId: string; approve: boolean }>({
      query: ({ orderId, approve }) => ({ url: `/payments/dev/simulate/${orderId}`, method: 'POST', body: { approve } }),
      invalidatesTags: ['Order', 'Product', 'Inventory'],
    }),

    createBodyProfile: builder.mutation<
      BodyProfile,
      { heightCm: number; bustCm: number; waistCm: number; hipsCm: number; shoulderWidthCm: number; armLengthCm: number; source?: string }
    >({
      query: (body) => ({ url: '/body-profiles', method: 'POST', body }),
      invalidatesTags: ['BodyProfile'],
    }),
    getMyBodyProfile: builder.query<BodyProfile, void>({
      query: () => '/body-profiles/me',
      providesTags: ['BodyProfile'],
    }),
    recommendSize: builder.mutation<
      SizeRecommendation,
      {
        productId?: string;
        bustCm?: number;
        waistCm?: number;
        hipsCm?: number;
        shoulderWidthCm?: number;
        armLengthCm?: number;
        heightCm?: number;
        stylePreference?: 'comfort' | 'regular' | 'slim';
      }
    >({
      query: (body) => ({ url: '/size-advisor/recommend', method: 'POST', body }),
    }),

    getTopSelling: builder.query<TopSellingProduct[], { days?: number; limit?: number } | void>({
      query: (params) => ({ url: '/dropshipping/top-selling', params: params ?? {} }),
    }),
    getRestockAlerts: builder.query<RestockAlert[], { days?: number } | void>({
      query: (params) => ({ url: '/dropshipping/restock-alerts', params: params ?? {} }),
    }),
    getCategoryDemand: builder.query<CategoryDemand[], { days?: number } | void>({
      query: (params) => ({ url: '/dropshipping/category-demand', params: params ?? {} }),
    }),

    getTrends: builder.query<TrendsSnapshot, void>({
      query: () => '/trends',
    }),
    generateMarketingPost: builder.mutation<GeneratedPost, { productId: string }>({
      query: (body) => ({ url: '/marketing/generate-post', method: 'POST', body }),
    }),
    sendChatMessage: builder.mutation<ChatbotReply, { message: string }>({
      query: (body) => ({ url: '/chatbot/message', method: 'POST', body }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useGetProductForManagementQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadImageMutation,
  useAdjustStockMutation,
  useGetLowStockAlertsQuery,
  useGetProductMovementsQuery,
  useGetMyProductsQuery,
  useApplyProviderMutation,
  useGetMyProviderProfileQuery,
  useGetProvidersQuery,
  useApproveProviderMutation,
  useRejectProviderMutation,
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useGetAllOrdersQuery,
  useGetProviderOrderItemsQuery,
  useLazyGetCheckoutLinkQuery,
  useSimulatePaymentMutation,
  useCreateBodyProfileMutation,
  useGetMyBodyProfileQuery,
  useRecommendSizeMutation,
  useGetTopSellingQuery,
  useGetRestockAlertsQuery,
  useGetCategoryDemandQuery,
  useGetTrendsQuery,
  useGenerateMarketingPostMutation,
  useSendChatMessageMutation,
} = apiSlice;
