import React, { useReducer, useEffect } from "react";
import "./TemplateBuilder.css";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "signature", label: "Signature" },
  { value: "photo", label: "Photo" },
];

const initialState = {
  templates: {},
  selectedTemplate: null,
  newTemplateName: "",
  sections: [],
};

function templateReducer(state, action) {
  switch (action.type) {
    case "SET_TEMPLATES":
      return { ...state, templates: action.payload };
    case "SELECT_TEMPLATE":
      const template = state.templates[action.payload];
      return {
        ...state,
        selectedTemplate: action.payload,
        sections: template ? template.sections : [],
        newTemplateName: action.payload,
      };
    case "UPDATE_NEW_TEMPLATE_NAME":
      return { ...state, newTemplateName: action.payload };
    case "ADD_SECTION":
      const newSection = { id: Date.now(), name: `New Section ${state.sections.length + 1}`, items: [] };
      return { ...state, sections: [...state.sections, newSection] };
    case "UPDATE_SECTION_NAME":
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.id ? { ...section, name: action.payload.name } : section
        ),
      };
    case "DELETE_SECTION":
      return { ...state, sections: state.sections.filter(section => section.id !== action.payload) };
    case "ADD_ITEM":
      const newItem = { id: Date.now(), text: "New Item", fieldType: "text" };
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.sectionId ? { ...section, items: [...section.items, newItem] } : section
        ),
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.sectionId
            ? {
                ...section,
                items: section.items.map(item =>
                  item.id === action.payload.item.id ? action.payload.item : item
                ),
              }
            : section
        ),
      };
    case "DELETE_ITEM":
      return {
        ...state,
        sections: state.sections.map(section =>
          section.id === action.payload.sectionId
            ? { ...section, items: section.items.filter(item => item.id !== action.payload.itemId) }
            : section
        ),
      };
    case "RESET":
      return { ...initialState, templates: state.templates };
    default:
      return state;
  }
}

function TemplateBuilder() {
  const [state, dispatch] = useReducer(templateReducer, initialState);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const templates = await window.api.getTemplates();
        dispatch({ type: "SET_TEMPLATES", payload: templates });
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    }
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    if (!state.newTemplateName) {
      alert("Please enter a template name.");
      return;
    }
    const newTemplate = { sections: state.sections };
    try {
      await window.api.saveTemplate(state.newTemplateName, newTemplate);
      dispatch({ type: "SET_TEMPLATES", payload: { ...state.templates, [state.newTemplateName]: newTemplate } });
      alert("Template saved successfully!");
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Error saving template.");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!state.selectedTemplate) {
      alert("Please select a template to delete.");
      return;
    }
    const templateToDelete = state.templates[state.selectedTemplate];
    if (!templateToDelete || !templateToDelete.id) {
      alert("Cannot delete - template ID not found.");
      return;
    }

    try {
      await window.api.deleteTemplate(templateToDelete.id);
      const newTemplates = { ...state.templates };
      delete newTemplates[state.selectedTemplate];
      dispatch({ type: "SET_TEMPLATES", payload: newTemplates });
      dispatch({ type: "RESET" });
      alert("Template deleted successfully!");
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("Error deleting template.");
    }
  };

  return (
    <div className="template-builder">
      <h2>Custom Inspection Template Builder</h2>

      <div className="template-controls">
        <select
          value={state.selectedTemplate || ""}
          onChange={e => dispatch({ type: "SELECT_TEMPLATE", payload: e.target.value })}
        >
          <option value="">Select a template to edit</option>
          {Object.keys(state.templates).map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="New or updated template name"
          value={state.newTemplateName}
          onChange={e => dispatch({ type: "UPDATE_NEW_TEMPLATE_NAME", payload: e.target.value })}
        />
        <button onClick={handleSaveTemplate}>Save Template</button>
        <button onClick={() => dispatch({ type: "RESET" })}>New Template</button>
        <button onClick={handleDeleteTemplate} className="delete-button">Delete Selected Template</button>
      </div>

      <div className="template-editor">
        {state.sections.map(section => (
          <div key={section.id} className="section">
            <div className="section-header">
              <input
                type="text"
                value={section.name}
                onChange={e => dispatch({ type: "UPDATE_SECTION_NAME", payload: { id: section.id, name: e.target.value } })}
              />
              <button onClick={() => dispatch({ type: "DELETE_SECTION", payload: section.id })}>Delete Section</button>
            </div>
            <div className="section-items">
              {section.items.map(item => (
                <div key={item.id} className="item">
                  <input
                    type="text"
                    value={item.text}
                    onChange={e =>
                      dispatch({ type: "UPDATE_ITEM", payload: { sectionId: section.id, item: { ...item, text: e.target.value } } })
                    }
                  />
                  <select
                    value={item.fieldType}
                    onChange={e =>
                      dispatch({
                        type: "UPDATE_ITEM",
                        payload: { sectionId: section.id, item: { ...item, fieldType: e.target.value } },
                      })
                    }
                  >
                    {FIELD_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                  {item.fieldType === "dropdown" && (
                    <input
                      type="text"
                      placeholder="Options (comma-separated)"
                      value={item.options?.join(",") || ""}
                      onChange={e =>
                        dispatch({
                          type: "UPDATE_ITEM",
                          payload: {
                            sectionId: section.id,
                            item: { ...item, options: e.target.value.split(",") },
                          },
                        })
                      }
                    />
                  )}
                  <button onClick={() => dispatch({ type: "DELETE_ITEM", payload: { sectionId: section.id, itemId: item.id } })}>
                    Delete
                  </button>
                </div>
              ))}
              <button onClick={() => dispatch({ type: "ADD_ITEM", payload: { sectionId: section.id } })}>
                Add Item
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => dispatch({ type: "ADD_SECTION" })}>Add Section</button>
      </div>
    </div>
  );
}

export default TemplateBuilder;
