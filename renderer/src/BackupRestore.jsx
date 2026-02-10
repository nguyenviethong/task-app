import React from "react";

const api = window.api;

export default function BackupRestore({ styles, onReload, toast }) {
	
  async function handleImport() {
    const ok = await api.importTasks();

    if (ok && onReload) {
      onReload(); // 🔥 reload UI
	  toast.success("Import dữ liệu thành công");
    }else {
	  toast.error("Xảy ra lỗi khi import. Vui lòng thử lại");
	}
  }
	
  return (
  <div style={styles.card}>
		<button style={styles.button} onClick={() => api.exportTasks()}>
		  Export JSON
		</button>

		<button style={styles.button} onClick={handleImport}>
		  Import JSON
		</button>
  </div>
  
  );
  
  
}


