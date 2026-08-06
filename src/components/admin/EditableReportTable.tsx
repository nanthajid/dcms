import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface TableRow {
  id: string;
  [key: string]: any;
}

interface EditableReportTableProps {
  headers: string[];
  data: TableRow[];
  onDataChange: (data: TableRow[]) => void;
  title?: string;
}

const EditableReportTable: React.FC<EditableReportTableProps> = ({
  headers,
  data,
  onDataChange,
  title = 'รายงาน'
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TableRow>>({});
  const [newRow, setNewRow] = useState<Partial<TableRow>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleEdit = (row: TableRow) => {
    setEditingId(row.id);
    setEditData({ ...row });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const updated = data.map(row =>
      row.id === editingId ? { ...row, ...editData } : row
    );
    onDataChange(updated);
    setEditingId(null);
    toast.success('แก้ไขข้อมูลสำเร็จ');
  };

  const handleDelete = (id: string) => {
    if (confirm('ยืนยันการลบข้อมูลนี้หรือไม่?')) {
      const filtered = data.filter(row => row.id !== id);
      onDataChange(filtered);
      toast.success('ลบข้อมูลสำเร็จ');
    }
  };

  const handleAddNew = () => {
    if (!newRow.id) {
      toast.error('กรุณาระบุ ID');
      return;
    }

    const duplicate = data.find(row => row.id === newRow.id);
    if (duplicate) {
      toast.error('ID นี้มีอยู่แล้ว');
      return;
    }

    const rowWithDefaults: TableRow = {
      id: newRow.id as string,
      ...Object.fromEntries(headers.filter(h => h !== 'id').map(h => [h, newRow[h] || '']))
    };

    onDataChange([...data, rowWithDefaults]);
    setNewRow({});
    setIsAddingNew(false);
    toast.success('เพิ่มข้อมูลสำเร็จ');
  };

  const handleExportJSON = () => {
    const jsonData = {
      title,
      headers,
      data,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('ส่งออก JSON สำเร็จ');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const jsonData = JSON.parse(content);

        if (jsonData.data && Array.isArray(jsonData.data)) {
          onDataChange(jsonData.data);
          toast.success('นำเข้า JSON สำเร็จ');
        } else {
          toast.error('รูปแบบ JSON ไม่ถูกต้อง');
        }
      } catch (err) {
        toast.error('ไม่สามารถอ่านไฟล์ JSON ได้');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors font-medium text-sm">
            <Download size={16} />
            นำเข้า JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Download size={16} />
            ส่งออก JSON
          </button>
          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            เพิ่มแถว
          </button>
        </div>
      </div>

      {/* Add New Row Form */}
      {isAddingNew && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {headers.map(header => (
              <div key={header}>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {header}
                </label>
                <input
                  type="text"
                  value={newRow[header] || ''}
                  onChange={(e) => setNewRow({ ...newRow, [header]: e.target.value })}
                  placeholder={`กรุณาระบุ ${header}`}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 font-medium"
            >
              <Check size={14} />
              บันทึก
            </button>
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewRow({});
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-300 text-slate-700 rounded text-sm hover:bg-slate-400 font-medium"
            >
              <X size={14} />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-bold text-slate-700 w-12 text-center">#</th>
              {headers.map(header => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-bold text-slate-700"
                >
                  {header}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-bold text-slate-700 w-32">
                ดำเนินการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-center text-slate-500 font-medium">
                  {idx + 1}
                </td>

                {headers.map(header => (
                  <td key={`${row.id}-${header}`} className="px-4 py-3">
                    {editingId === row.id ? (
                      <input
                        type="text"
                        value={editData[header] || ''}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            [header]: e.target.value
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-primary text-xs"
                      />
                    ) : (
                      <span className="text-slate-700">{row[header]}</span>
                    )}
                  </td>
                ))}

                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    {editingId === row.id ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                          title="บันทึก"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 transition-colors"
                          title="ยกเลิก"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p>ไม่มีข้อมูล กรุณาเพิ่มแถวใหม่</p>
        </div>
      )}

      {/* JSON Preview */}
      <details className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <summary className="font-bold text-slate-800 cursor-pointer hover:text-primary">
          ดูรูปแบบ JSON
        </summary>
        <pre className="mt-3 bg-white p-3 rounded border border-slate-200 overflow-x-auto text-xs">
          {JSON.stringify(
            {
              title,
              headers,
              data
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
};

export default EditableReportTable;
