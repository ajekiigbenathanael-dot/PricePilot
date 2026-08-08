import { useParams } from 'react-router-dom';
import { PlaceholderPage } from './PlaceholderPage';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PlaceholderPage
      title="Product detail"
      description={`Price comparison view${id ? ` for product ${id}` : ''}.`}
    />
  );
}
