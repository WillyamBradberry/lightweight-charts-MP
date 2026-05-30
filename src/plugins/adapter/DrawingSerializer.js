// src/plugins/adapter/DrawingSerializer.js
export class DrawingSerializer {
  constructor(lineToolManager) {
    this._manager = lineToolManager;
  }

  export() {
    const tools = this._manager._tools || [];
    return tools.map(tool => ({
      type: tool._toolType || tool.constructor.name,
      points: tool._points || [],
      options: { ...tool._options },
      id: tool._id || crypto.randomUUID()
    }));
  }

  import(data) {
    // Очищаем текущие
    this._manager.clearTools();
    
    // Восстанавливаем
    for (const drawing of data) {
      // Создаём через plugin API
      this._manager.startTool(drawing.type);
      // ... применяем точки и опции
    }
  }
}