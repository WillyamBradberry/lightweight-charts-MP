// src/components/Editor/VisualEditor.jsx
export function VisualEditor({ schema, config, onChange }) {
  const [activeTab, setActiveTab] = useState('features');

  const tabs = [
    { id: 'features', label: 'Features', icon: 'Layers' },
    { id: 'styles', label: 'Styles', icon: 'Palette' },
    { id: 'behaviors', label: 'Behaviors', icon: 'Settings' },
    { id: 'icons', label: 'Icons', icon: 'Image' }
  ];

  return (
    <div className={styles.editor}>
      {/* Tab Navigation */}
      <nav className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? styles.active : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Feature Toggles */}
      {activeTab === 'features' && (
        <FeaturePanel
          schema={schema.features}
          values={config.features}
          onChange={(path, value) => onChange(`features.${path}`, value)}
        />
      )}

      {/* Style Editor with Live Preview */}
      {activeTab === 'styles' && (
        <StylePanel
          schema={schema.styles}
          values={config.styles}
          onChange={(path, value) => onChange(`styles.${path}`, value)}
        />
      )}

      {/* Behavior Settings */}
      {activeTab === 'behaviors' && (
        <BehaviorPanel
          schema={schema.behaviors}
          values={config.behaviors}
          onChange={(path, value) => onChange(`behaviors.${path}`, value)}
        />
      )}

      {/* Icon Manager */}
      {activeTab === 'icons' && (
        <IconPanel
          onUpload={(id, svg) => onChange(`icons.${id}`, svg)}
          onReset={(id) => onChange(`icons.${id}`, null)}
        />
      )}
    </div>
  );
}