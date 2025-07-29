export default function NewProductPage() {
  return (
    <main className="container mt-5">
      <h1 className="mb-4">Añadir Nuevo Mueble</h1>
      <form>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Nombre del Mueble</label>
          <input type="text" className="form-control" id="name" />
        </div>
        <div className="mb-3">
          <label htmlFor="stock" className="form-label">Stock Inicial</label>
          <input type="number" className="form-control" id="stock" />
        </div>
        <div className="mb-3">
          <label htmlFor="price" className="form-label">Precio</label>
          <input type="number" step="0.01" className="form-control" id="price" />
        </div>
        <button type="submit" className="btn btn-primary">Guardar</button>
      </form>
    </main>
  );
}
