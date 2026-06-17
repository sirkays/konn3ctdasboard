import React, { useEffect, useRef, useState } from "react";
import { Copy, Printer, Table as TableIcon } from "lucide-react";

import { useToast } from "../hooks/use-toast";
import { Button } from "./ui/button";

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rowsToTSV(headers, rows) {
  const headerLine = headers.join("\t");
  const lines = rows.map((row) =>
    headers.map((header) => row[header] ?? "").join("\t")
  );
  return [headerLine, ...lines].join("\n");
}

function rowsToCSV(headers, rows) {
  const escapeValue = (value) => {
    const stringValue = String(value ?? "");
    const needsQuotes = /[",\n\r]/.test(stringValue);
    const safeValue = stringValue.replaceAll('"', '""');
    return needsQuotes ? `"${safeValue}"` : safeValue;
  };

  const headerLine = headers.map(escapeValue).join(",");
  const lines = rows.map((row) =>
    headers.map((header) => escapeValue(row[header])).join(",")
  );

  return [headerLine, ...lines].join("\n");
}

function rowsToExcelHTML(title, headers, rows) {
  const thead = `<tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr>`;

  const tbody = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h3>${escapeHtml(title)}</h3>
  <table border="1" cellspacing="0" cellpadding="6">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Continue to fallback.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const wasCopied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return wasCopied;
  } catch (error) {
    return false;
  }
}

function printRows(title, headers, rows, footerLabel, onPopupBlocked) {
  const win = window.open("", "_blank", "width=900,height=700");

  if (!win) {
    onPopupBlocked?.();
    return;
  }

  const thead = `<tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr>`;

  const tbody = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const footer = footerLabel
    ? `<div class="footer"><p>${escapeHtml(footerLabel)}</p></div>`
    : "";

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 13px; }
          th { background: #f3f3f3; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <h1>Konn3ct</h1>
        <p class="subtitle">${escapeHtml(title)}</p>
        <table>
          <thead>${thead}</thead>
          <tbody>${tbody}</tbody>
        </table>
        ${footer}
        <script>
          window.onload = function () { window.print(); };
        </script>
      </body>
    </html>
  `);

  win.document.close();
}

const defaultLabels = {
  copy: "Copy",
  copied: "Copied!",
  csv: "CSV",
  excel: "Excel",
  print: "Print",
};

export function ExportActions({
  headers,
  rows,
  title,
  filenameBase = "export",
  labels = {},
  toastMessages = {},
  printFooter,
  showCopiedState = false,
  className = "flex flex-wrap items-center gap-2",
  buttonClassName = "h-9 rounded-lg border-border/60",
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);

  const mergedLabels = { ...defaultLabels, ...labels };

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const tsv = rowsToTSV(headers, rows);
    const wasCopied = await copyToClipboard(tsv);

    if (wasCopied) {
      if (showCopiedState) {
        setCopied(true);
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
      }

      if (toastMessages.copied) {
        toast({ description: toastMessages.copied });
      }
      return;
    }

    if (toastMessages.copyFailed) {
      toast({
        description: toastMessages.copyFailed,
        variant: "destructive",
      });
    }
  };

  const handleCSV = () => {
    const csv = rowsToCSV(headers, rows);
    downloadBlob(
      `${filenameBase}.csv`,
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );

    if (toastMessages.csvDownloaded) {
      toast({ description: toastMessages.csvDownloaded });
    }
  };

  const handleExcel = () => {
    const html = rowsToExcelHTML(title, headers, rows);
    downloadBlob(
      `${filenameBase}.xls`,
      new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" })
    );

    if (toastMessages.excelDownloaded) {
      toast({ description: toastMessages.excelDownloaded });
    }
  };

  const handlePrint = () => {
    printRows(title, headers, rows, printFooter, () => {
      if (toastMessages.allowPopups) {
        toast({
          description: toastMessages.allowPopups,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={buttonClassName}
      >
        <Copy className="mr-2 h-3.5 w-3.5" />
        {copied ? mergedLabels.copied : mergedLabels.copy}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSV}
        className={buttonClassName}
      >
        <TableIcon className="mr-2 h-3.5 w-3.5" />
        {mergedLabels.csv}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExcel}
        className={buttonClassName}
      >
        <TableIcon className="mr-2 h-3.5 w-3.5" />
        {mergedLabels.excel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className={buttonClassName}
      >
        <Printer className="mr-2 h-3.5 w-3.5" />
        {mergedLabels.print}
      </Button>
    </div>
  );
}

export default ExportActions;
