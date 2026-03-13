import { Component } from "react";

export class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 grid place-items-center bg-gray-50">
          <div className="text-center space-y-3 p-8 max-w-md">
            <p className="text-lg font-semibold text-gray-800">Nao foi possivel carregar a cena 3D</p>
            <p className="text-sm text-gray-500">
              Verifique se o seu navegador suporta WebGL. Tente recarregar a pagina ou usar um navegador diferente.
            </p>
            <button
              className="mt-4 px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
