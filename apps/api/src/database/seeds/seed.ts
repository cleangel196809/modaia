import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/user.entity';
import { Category } from '../../modules/categories/category.entity';
import { Product } from '../../modules/products/product.entity';
import { ProviderProfile, ProviderStatus } from '../../modules/providers/provider-profile.entity';
import { Order, OrderStatus } from '../../modules/orders/order.entity';
import { OrderItem } from '../../modules/orders/order-item.entity';
import { InventoryMovement, MovementType } from '../../modules/inventory/inventory-movement.entity';
import { Role } from '../../common/enums/role.enum';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);
  const productRepo = AppDataSource.getRepository(Product);
  const providerProfileRepo = AppDataSource.getRepository(ProviderProfile);
  const orderRepo = AppDataSource.getRepository(Order);
  const orderItemRepo = AppDataSource.getRepository(OrderItem);
  const movementRepo = AppDataSource.getRepository(InventoryMovement);

  const adminEmail = 'admin@modaia.co';
  const existingAdmin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin123!', 12);
    await userRepo.save(
      userRepo.create({
        fullName: 'Administradora ModaIA',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
      }),
    );
    console.log(`Usuario admin creado: ${adminEmail} / Admin123!`);
  } else {
    console.log('Usuario admin ya existe, se omite.');
  }

  async function ensureProvider(options: {
    email: string;
    fullName: string;
    businessName: string;
    taxId: string;
    phone: string;
    city: string;
    status: ProviderStatus;
  }): Promise<User> {
    let user = await userRepo.findOne({ where: { email: options.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash('Provider123!', 12);
      user = await userRepo.save(
        userRepo.create({
          fullName: options.fullName,
          email: options.email,
          passwordHash,
          role: options.status === ProviderStatus.APPROVED ? Role.PROVIDER : Role.CUSTOMER,
        }),
      );
      console.log(`Usuario proveedor creado: ${options.email} / Provider123! (${options.status})`);
    }

    const existingProfile = await providerProfileRepo.findOne({ where: { userId: user.id } });
    if (!existingProfile) {
      await providerProfileRepo.save(
        providerProfileRepo.create({
          userId: user.id,
          businessName: options.businessName,
          taxId: options.taxId,
          phone: options.phone,
          city: options.city,
          status: options.status,
        }),
      );
      console.log(`Perfil de proveedor creado: ${options.businessName} (${options.status})`);
    }
    return user;
  }

  const approvedProvider = await ensureProvider({
    email: 'confecciones.andina@modaia.co',
    fullName: 'Confecciones Andina',
    businessName: 'Confecciones Andina SAS',
    taxId: '900123456-7',
    phone: '+57 300 123 4567',
    city: 'Medellín',
    status: ProviderStatus.APPROVED,
  });

  await ensureProvider({
    email: 'taller.bogota@modaia.co',
    fullName: 'Taller Bogotá Textil',
    businessName: 'Taller Bogotá Textil Ltda',
    taxId: '900987654-3',
    phone: '+57 310 987 6543',
    city: 'Bogotá',
    status: ProviderStatus.PENDING,
  });

  const categoryNames = ['Blusas formales', 'Blusas casuales', 'Chaquetas', 'Conjuntos', 'Nueva colección'];
  const categories: Category[] = [];
  for (const name of categoryNames) {
    let category = await categoryRepo.findOne({ where: { name } });
    if (!category) {
      category = await categoryRepo.save(categoryRepo.create({ name, slug: slugify(name) }));
      console.log(`Categoría creada: ${name}`);
    }
    categories.push(category);
  }

  const CATEGORY_IMAGE: Record<string, string> = {
    'blusas-formales': '/products/blusa-formal.jpg',
    'blusas-casuales': '/products/blusa-casual.jpg',
    chaquetas: '/products/chaqueta.jpg',
    conjuntos: '/products/conjunto.jpg',
    'nueva-coleccion': '/products/nueva-coleccion.jpg',
  };

  const demoProducts = [
    {
      sku: 'BLU-FORM-001',
      name: 'Blusa formal manga larga',
      category: categories[0],
      price: 129900,
      cost: 62000,
      stock: 25,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Blanco', 'Negro'],
      material: 'Algodón 95% - Elastano 5%',
      description: 'Blusa formal ideal para oficina, corte clásico.',
      images: [CATEGORY_IMAGE['blusas-formales']],
    },
    {
      sku: 'BLU-CAS-001',
      name: 'Blusa casual estampada',
      category: categories[1],
      price: 89900,
      cost: 38000,
      stock: 4,
      sizes: ['S', 'M', 'L'],
      colors: ['Multicolor'],
      material: 'Viscosa',
      description: 'Blusa fresca de uso diario con estampado floral.',
      images: [CATEGORY_IMAGE['blusas-casuales']],
    },
    {
      sku: 'CHQ-001',
      name: 'Chaqueta blazer entallada',
      category: categories[2],
      price: 189900,
      cost: 95000,
      stock: 12,
      sizes: ['S', 'M', 'L'],
      colors: ['Negro', 'Beige'],
      material: 'Poliéster premium',
      description: 'Blazer entallado, ideal para looks ejecutivos.',
      images: [CATEGORY_IMAGE.chaquetas],
    },
    {
      sku: 'CNJ-AND-001',
      name: 'Conjunto artesanal Andina',
      category: categories[3],
      price: 219900,
      cost: 110000,
      stock: 8,
      sizes: ['S', 'M', 'L'],
      colors: ['Terracota', 'Verde oliva'],
      material: 'Algodón orgánico',
      description: 'Conjunto de dos piezas confeccionado por Confecciones Andina.',
      providerId: approvedProvider.id,
      images: [CATEGORY_IMAGE.conjuntos],
    },
  ];

  for (const demo of demoProducts) {
    const existing = await productRepo.findOne({ where: { sku: demo.sku } });
    if (!existing) {
      await productRepo.save(
        productRepo.create({
          ...demo,
          categoryId: demo.category.id,
        }),
      );
      console.log(`Producto creado: ${demo.name}`);
    }
  }

  // Cualquier producto sin fotos (incluidos los creados a mano desde la UI durante pruebas)
  // recibe una imagen de muestra según su categoría, para que el catálogo nunca se vea vacío.
  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
  const productsWithoutImages = await productRepo.find();
  for (const product of productsWithoutImages) {
    if (product.images && product.images.length > 0) continue;
    const slug = categorySlugById.get(product.categoryId);
    const image = slug ? CATEGORY_IMAGE[slug] : undefined;
    if (image) {
      await productRepo.update(product.id, { images: [image] });
      console.log(`Imagen de muestra asignada a: ${product.name}`);
    }
  }

  const customerEmail = 'cliente.demo@modaia.co';
  let customer = await userRepo.findOne({ where: { email: customerEmail } });
  if (!customer) {
    const passwordHash = await bcrypt.hash('Cliente123!', 12);
    customer = await userRepo.save(
      userRepo.create({
        fullName: 'Valentina Cliente',
        email: customerEmail,
        passwordHash,
        role: Role.CUSTOMER,
      }),
    );
    console.log(`Usuario cliente creado: ${customerEmail} / Cliente123!`);
  }

  const existingOrders = await orderRepo.count({ where: { userId: customer.id } });
  if (existingOrders === 0) {
    const blusaFormal = await productRepo.findOneOrFail({ where: { sku: 'BLU-FORM-001' } });
    const conjuntoAndina = await productRepo.findOneOrFail({ where: { sku: 'CNJ-AND-001' } });

    const paidSubtotal = Number(blusaFormal.price) * 1 + Number(conjuntoAndina.price) * 1;
    const paidOrder = await orderRepo.save(
      orderRepo.create({
        userId: customer.id,
        status: OrderStatus.PAID,
        subtotal: paidSubtotal,
        shippingCost: 0,
        total: paidSubtotal,
        shippingFullName: customer.fullName,
        shippingPhone: '+57 320 555 1234',
        shippingAddress: 'Carrera 15 # 88-21, Apto 302',
        shippingCity: 'Bogotá',
        paymentReference: 'seed_demo_paid',
        paidAt: new Date(),
      }),
    );
    await orderItemRepo.save([
      orderItemRepo.create({
        orderId: paidOrder.id,
        productId: blusaFormal.id,
        providerId: blusaFormal.providerId ?? null,
        productName: blusaFormal.name,
        sku: blusaFormal.sku,
        unitPrice: blusaFormal.price,
        quantity: 1,
        subtotal: blusaFormal.price,
      }),
      orderItemRepo.create({
        orderId: paidOrder.id,
        productId: conjuntoAndina.id,
        providerId: conjuntoAndina.providerId ?? null,
        productName: conjuntoAndina.name,
        sku: conjuntoAndina.sku,
        unitPrice: conjuntoAndina.price,
        quantity: 1,
        subtotal: conjuntoAndina.price,
      }),
    ]);
    // Reflejar el descuento de stock que habría hecho PaymentsService al confirmar el pago.
    for (const product of [blusaFormal, conjuntoAndina]) {
      const stockAfter = product.stock - 1;
      await productRepo.update(product.id, { stock: stockAfter });
      await movementRepo.save(
        movementRepo.create({
          productId: product.id,
          type: MovementType.OUT,
          quantity: 1,
          stockAfter,
          reason: `Venta — pedido ${paidOrder.id}`,
        }),
      );
    }
    console.log('Pedido demo pagado creado.');

    const pendingSubtotal = Number(blusaFormal.price) * 1;
    const pendingOrder = await orderRepo.save(
      orderRepo.create({
        userId: customer.id,
        status: OrderStatus.PENDING_PAYMENT,
        subtotal: pendingSubtotal,
        shippingCost: 12000,
        total: pendingSubtotal + 12000,
        shippingFullName: customer.fullName,
        shippingPhone: '+57 320 555 1234',
        shippingAddress: 'Carrera 15 # 88-21, Apto 302',
        shippingCity: 'Bogotá',
      }),
    );
    await orderItemRepo.save(
      orderItemRepo.create({
        orderId: pendingOrder.id,
        productId: blusaFormal.id,
        providerId: blusaFormal.providerId ?? null,
        productName: blusaFormal.name,
        sku: blusaFormal.sku,
        unitPrice: blusaFormal.price,
        quantity: 1,
        subtotal: blusaFormal.price,
      }),
    );
    console.log('Pedido demo pendiente de pago creado.');
  }

  await AppDataSource.destroy();
  console.log('Seed completado.');
}

seed().catch((error) => {
  console.error('Error ejecutando el seed:', error);
  process.exit(1);
});
