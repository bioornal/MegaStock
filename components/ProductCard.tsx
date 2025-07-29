import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    brand: string;
    stock: number;
    price: number;
    image: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="card h-100">
      <Image src={product.image} className="card-img-top" alt={product.name} width={150} height={150} />
      <div className="card-body">
        <h5 className="card-title">{product.name}</h5>
        <p className="card-text">Marca: {product.brand}</p>
        <p className="card-text">Stock: {product.stock}</p>
        <p className="card-text">Precio: ${product.price}</p>
      </div>
    </div>
  );
}
