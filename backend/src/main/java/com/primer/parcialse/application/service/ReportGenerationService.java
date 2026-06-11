package com.primer.parcialse.application.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ReportGenerationService {

    private final S3StorageService s3StorageService;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    // Cache local en memoria como fallback si S3 no está configurado
    private static final Map<String, byte[]> localFileCache = new ConcurrentHashMap<>();
    private static final Map<String, String> localContentTypeCache = new ConcurrentHashMap<>();

    public byte[] getCachedFile(String key) {
        return localFileCache.get(key);
    }

    public String getCachedContentType(String key) {
        return localContentTypeCache.get(key);
    }

    public String generateAndSaveReport(
            String title,
            String description,
            List<Map<String, Object>> columns,
            List<Map<String, Object>> data,
            String format,
            String backendBaseUrl,
            Map<String, Object> chartConfig) throws IOException {

        byte[] fileBytes;
        String contentType;
        String extension;

        switch (format.toLowerCase()) {
            case "pdf":
                fileBytes = generatePdf(title, description, columns, data, chartConfig);
                contentType = "application/pdf";
                extension = ".pdf";
                break;
            case "xlsx":
                fileBytes = generateXlsx(title, columns, data);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                extension = ".xlsx";
                break;
            case "docx":
                fileBytes = generateDocx(title, description, columns, data);
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = ".docx";
                break;
            case "csv":
            default:
                fileBytes = generateCsv(columns, data);
                contentType = "text/csv";
                extension = ".csv";
                break;
        }

        String filename = "reporte_" + UUID.randomUUID().toString() + extension;

        // Comprobar si S3 está configurado. Si no, guardar en caché local y retornar URL local.
        if (s3Client != null && s3Presigner != null) {
            String folder = "reportesKPI";
            String key = folder + "/" + filename;
            
            try {
                // Sacamos el bucketName directamente de S3StorageService de forma indirecta
                // o usando un upload customizado directamente
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(s3StorageService.generatePresignedUrl("test").split(".s3.amazonaws.com")[0].split("://")[1])
                        .key(key)
                        .contentType(contentType)
                        .build();
                s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileBytes));
                return s3StorageService.generatePresignedUrl(key);
            } catch (Exception e) {
                System.err.println("WARNING: S3 upload failed, falling back to local memory storage: " + e.getMessage());
                // Fallback to local cache if S3 upload crashed
            }
        }

        // Cachear localmente
        String localKey = filename;
        localFileCache.put(localKey, fileBytes);
        localContentTypeCache.put(localKey, contentType);

        // Retornar URL local
        return backendBaseUrl + "/api/v1/reports/download/" + localKey;
    }

    private byte[] generatePdf(String title, String description, List<Map<String, Object>> columns, List<Map<String, Object>> data, Map<String, Object> chartConfig) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document();
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Título
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            document.add(new Paragraph(title, titleFont));
            document.add(new Paragraph("\n"));

            // Descripción (Análisis Textual)
            if (description != null && !description.isEmpty()) {
                Font descFont = FontFactory.getFont(FontFactory.TIMES_ROMAN, 13);
                Paragraph descPara = new Paragraph(description, descFont);
                descPara.setSpacingAfter(15);
                document.add(descPara);
            }

            // Insertar Gráfico si existe configuración
            if (chartConfig != null && !chartConfig.isEmpty()) {
                String type = (String) chartConfig.get("type");
                String xKey = (String) chartConfig.get("x_key");
                String yKey = (String) chartConfig.get("y_key");

                if (type != null && xKey != null && yKey != null) {
                    byte[] chartBytes = generateChartImage(type, xKey, yKey, data);
                    if (chartBytes.length > 0) {
                        com.lowagie.text.Image chartImage = com.lowagie.text.Image.getInstance(chartBytes);
                        chartImage.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
                        chartImage.scalePercent(80f); // Escalar al 80% para que quepa bien
                        document.add(chartImage);
                        document.add(new Paragraph("\n"));
                    }
                }
            }

            // Crear tabla
            int numCols = columns.size();
            PdfPTable table = new PdfPTable(numCols);
            table.setWidthPercentage(100);

            // Cabeceras
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            for (Map<String, Object> col : columns) {
                String label = (String) col.get("label");
                PdfPCell cell = new PdfPCell(new Paragraph(label != null ? label : "", headFont));
                cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
                cell.setPadding(5);
                table.addCell(cell);
            }

            // Datos
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            for (Map<String, Object> row : data) {
                for (Map<String, Object> col : columns) {
                    String key = (String) col.get("key");
                    Object val = row.get(key);
                    String text = val != null ? val.toString() : "";
                    PdfPCell cell = new PdfPCell(new Paragraph(text, bodyFont));
                    cell.setPadding(5);
                    table.addCell(cell);
                }
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private byte[] generateCsv(List<Map<String, Object>> columns, List<Map<String, Object>> data) {
        StringBuilder csv = new StringBuilder();

        // Cabeceras
        for (int i = 0; i < columns.size(); i++) {
            String label = (String) columns.get(i).get("label");
            csv.append(escapeCsv(label != null ? label : ""));
            if (i < columns.size() - 1) csv.append(",");
        }
        csv.append("\n");

        // Datos
        for (Map<String, Object> row : data) {
            for (int i = 0; i < columns.size(); i++) {
                String key = (String) columns.get(i).get("key");
                Object val = row.get(key);
                csv.append(escapeCsv(val != null ? val.toString() : ""));
                if (i < columns.size() - 1) csv.append(",");
            }
            csv.append("\n");
        }

        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private byte[] generateXlsx(String title, List<Map<String, Object>> columns, List<Map<String, Object>> data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Reporte");

            // Título
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(title);
            CellStyle titleStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            // Cabeceras
            Row headerRow = sheet.createRow(2);
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            for (int i = 0; i < columns.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue((String) columns.get(i).get("label"));
                cell.setCellStyle(headerStyle);
            }

            // Datos
            int rowIdx = 3;
            for (Map<String, Object> row : data) {
                Row excelRow = sheet.createRow(rowIdx++);
                for (int i = 0; i < columns.size(); i++) {
                    String key = (String) columns.get(i).get("key");
                    Object val = row.get(key);
                    excelRow.createCell(i).setCellValue(val != null ? val.toString() : "");
                }
            }

            // Auto-ajustar ancho
            for (int i = 0; i < columns.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private byte[] generateDocx(
            String title,
            String description,
            List<Map<String, Object>> columns,
            List<Map<String, Object>> data) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XWPFDocument document = new XWPFDocument()) {
            // Título
            XWPFParagraph titlePara = document.createParagraph();
            titlePara.setAlignment(ParagraphAlignment.LEFT);
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(title);
            titleRun.setBold(true);
            titleRun.setFontSize(20);

            // Descripción
            if (description != null && !description.isEmpty()) {
                XWPFParagraph descPara = document.createParagraph();
                XWPFRun descRun = descPara.createRun();
                descRun.setText(description);
                descRun.setFontSize(11);
                descRun.setItalic(true);
            }

            // Espaciador
            document.createParagraph();

            // Tabla
            int numRows = data.size() + 1;
            int numCols = columns.size();
            XWPFTable table = document.createTable(numRows, numCols);

            // Cabeceras
            XWPFTableRow headerRow = table.getRow(0);
            for (int i = 0; i < columns.size(); i++) {
                XWPFTableCell cell = headerRow.getCell(i);
                cell.setText((String) columns.get(i).get("label"));
                cell.setColor("DCDCDC");
            }

            // Datos
            for (int r = 0; r < data.size(); r++) {
                XWPFTableRow row = table.getRow(r + 1);
                Map<String, Object> dataRow = data.get(r);
                for (int c = 0; c < columns.size(); c++) {
                    String key = (String) columns.get(c).get("key");
                    Object val = dataRow.get(key);
                    row.getCell(c).setText(val != null ? val.toString() : "");
                }
            }

            document.write(out);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    private byte[] generateChartImage(
            String type,
            String xKey,
            String yKey,
            List<Map<String, Object>> data) {
        
        System.setProperty("java.awt.headless", "true");
        
        int width = 600;
        int height = 350;
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_ARGB);
        java.awt.Graphics2D g2 = img.createGraphics();
        
        // Activar antialiasing
        g2.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(java.awt.RenderingHints.KEY_TEXT_ANTIALIASING, java.awt.RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        
        // Fondo - Premium Dark Theme (Slate 900)
        g2.setColor(new java.awt.Color(15, 23, 42));
        g2.fillRect(0, 0, width, height);
        
        if (data == null || data.isEmpty()) {
            g2.setColor(java.awt.Color.WHITE);
            g2.drawString("No hay datos disponibles para el gráfico", 200, 175);
            g2.dispose();
            return toByteArray(img);
        }
        
        // Parsear valores
        int size = Math.min(data.size(), 10); // Límite de top 10 para legibilidad
        double[] values = new double[size];
        String[] labels = new String[size];
        double maxValue = 1.0;
        
        for (int i = 0; i < size; i++) {
            Map<String, Object> row = data.get(i);
            Object xVal = row.get(xKey);
            Object yVal = row.get(yKey);
            
            labels[i] = xVal != null ? xVal.toString() : "N/A";
            if (labels[i].length() > 18) {
                labels[i] = labels[i].substring(0, 15) + "...";
            }
            
            double num = 0.0;
            if (yVal != null) {
                try {
                    num = Double.parseDouble(yVal.toString());
                } catch (NumberFormatException e) {
                    // Ignorar
                }
            }
            values[i] = num;
            if (num > maxValue) {
                maxValue = num;
            }
        }
        
        // Paleta de colores Premium HSL/RGB analógicos
        java.awt.Color[] colors = {
            new java.awt.Color(99, 102, 241),  // Indigo 500
            new java.awt.Color(59, 130, 246),  // Blue 500
            new java.awt.Color(16, 185, 129),  // Emerald 500
            new java.awt.Color(245, 158, 11),  // Amber 500
            new java.awt.Color(239, 68, 68),   // Red 500
            new java.awt.Color(139, 92, 246),  // Violet 500
            new java.awt.Color(236, 72, 153),  // Pink 500
            new java.awt.Color(14, 165, 233),  // Sky 500
            new java.awt.Color(20, 184, 166),  // Teal 500
            new java.awt.Color(132, 204, 22)   // Lime 500
        };
        
        if ("pie".equalsIgnoreCase(type)) {
            // Dibujar pastel
            double total = 0.0;
            for (double v : values) total += v;
            
            if (total == 0.0) {
                g2.setColor(java.awt.Color.WHITE);
                g2.drawString("Total es cero, no se puede graficar", 200, 175);
            } else {
                int cx = 180, cy = 175, r = 110;
                int startAngle = 90;
                
                for (int i = 0; i < size; i++) {
                    int arcAngle = (int) Math.round((values[i] / total) * 360.0);
                    g2.setColor(colors[i % colors.length]);
                    g2.fillArc(cx - r, cy - r, r * 2, r * 2, startAngle, -arcAngle);
                    
                    g2.setColor(new java.awt.Color(15, 23, 42));
                    g2.drawArc(cx - r, cy - r, r * 2, r * 2, startAngle, -arcAngle);
                    
                    // Leyenda
                    int legendX = 350;
                    int legendY = 60 + i * 25;
                    g2.setColor(colors[i % colors.length]);
                    g2.fillRect(legendX, legendY - 12, 15, 15);
                    
                    g2.setColor(new java.awt.Color(226, 232, 240));
                    g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 11));
                    String pctText = String.format("%s (%.1f%%)", labels[i], (values[i] / total) * 100.0);
                    g2.drawString(pctText, legendX + 25, legendY);
                    
                    startAngle -= arcAngle;
                }
            }
        } else if ("line".equalsIgnoreCase(type)) {
            // Dibujar gráfico de líneas
            int chartLeft = 60;
            int chartRight = width - 45;
            int chartTop = 40;
            int chartBottom = height - 60;
            
            int chartWidth = chartRight - chartLeft;
            int chartHeight = chartBottom - chartTop;
            
            g2.setColor(new java.awt.Color(51, 65, 85));
            g2.drawLine(chartLeft, chartBottom, chartRight, chartBottom);
            g2.drawLine(chartLeft, chartTop, chartLeft, chartBottom);
            
            int numGridLines = 4;
            g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 10));
            for (int i = 0; i <= numGridLines; i++) {
                int y = chartBottom - (i * chartHeight / numGridLines);
                double val = (i * maxValue / numGridLines);
                
                g2.setColor(new java.awt.Color(30, 41, 59));
                g2.drawLine(chartLeft, y, chartRight, y);
                
                g2.setColor(new java.awt.Color(148, 163, 184));
                g2.drawString(String.format("%.1f", val), 15, y + 4);
            }

            int[] xCoords = new int[size];
            int[] yCoords = new int[size];
            
            int stepX = size > 1 ? chartWidth / (size - 1) : chartWidth;
            for (int i = 0; i < size; i++) {
                xCoords[i] = chartLeft + (i * stepX);
                if (i == 0) xCoords[i] += 10;
                if (i == size - 1) xCoords[i] -= 10;
                
                int pointHeight = (int) Math.round((values[i] / maxValue) * chartHeight);
                yCoords[i] = chartBottom - pointHeight;
            }

            // Área sombreada bajo la línea (degradado premium)
            java.awt.Polygon area = new java.awt.Polygon();
            area.addPoint(xCoords[0], chartBottom);
            for (int i = 0; i < size; i++) {
                area.addPoint(xCoords[i], yCoords[i]);
            }
            area.addPoint(xCoords[size - 1], chartBottom);
            
            java.awt.Color areaColorStart = new java.awt.Color(99, 102, 241, 60);
            java.awt.Color areaColorEnd = new java.awt.Color(99, 102, 241, 0);
            java.awt.GradientPaint gp = new java.awt.GradientPaint(
                0, chartTop, areaColorStart, 0, chartBottom, areaColorEnd
            );
            g2.setPaint(gp);
            g2.fill(area);

            // Dibujar la línea de conexión
            g2.setStroke(new java.awt.BasicStroke(3.0f, java.awt.BasicStroke.CAP_ROUND, java.awt.BasicStroke.JOIN_ROUND));
            g2.setColor(new java.awt.Color(99, 102, 241));
            for (int i = 0; i < size - 1; i++) {
                g2.drawLine(xCoords[i], yCoords[i], xCoords[i + 1], yCoords[i + 1]);
            }

            // Dibujar los puntos (dots) y etiquetas
            g2.setStroke(new java.awt.BasicStroke(1.0f));
            for (int i = 0; i < size; i++) {
                g2.setColor(new java.awt.Color(99, 102, 241));
                g2.fillOval(xCoords[i] - 5, yCoords[i] - 5, 10, 10);
                g2.setColor(java.awt.Color.WHITE);
                g2.fillOval(xCoords[i] - 2, yCoords[i] - 2, 4, 4);

                // Etiqueta del valor arriba del punto
                g2.setColor(new java.awt.Color(226, 232, 240));
                g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 9));
                String valStr = String.format("%.1f", values[i]);
                int valStrWidth = g2.getFontMetrics().stringWidth(valStr);
                g2.drawString(valStr, xCoords[i] - valStrWidth / 2, yCoords[i] - 8);

                // Etiqueta del eje X abajo de la línea base
                g2.setColor(new java.awt.Color(148, 163, 184));
                g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 9));
                int labelWidth = g2.getFontMetrics().stringWidth(labels[i]);
                g2.drawString(labels[i], xCoords[i] - labelWidth / 2, chartBottom + 18);
            }
        } else {
            // Dibujar barras (verticales)
            int chartLeft = 60;
            int chartRight = width - 45;
            int chartTop = 40;
            int chartBottom = height - 60;
            
            int chartWidth = chartRight - chartLeft;
            int chartHeight = chartBottom - chartTop;
            
            g2.setColor(new java.awt.Color(51, 65, 85));
            g2.drawLine(chartLeft, chartBottom, chartRight, chartBottom);
            g2.drawLine(chartLeft, chartTop, chartLeft, chartBottom);
            
            int numGridLines = 4;
            g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 10));
            for (int i = 0; i <= numGridLines; i++) {
                int y = chartBottom - (i * chartHeight / numGridLines);
                double val = (i * maxValue / numGridLines);
                
                g2.setColor(new java.awt.Color(30, 41, 59));
                g2.drawLine(chartLeft, y, chartRight, y);
                
                g2.setColor(new java.awt.Color(148, 163, 184));
                g2.drawString(String.format("%.1f", val), 15, y + 4);
            }
            
            int barWidth = (chartWidth / size) - 16;
            if (barWidth < 5) barWidth = 5;
            
            for (int i = 0; i < size; i++) {
                int x = chartLeft + (i * chartWidth / size) + 8;
                int barHeight = (int) Math.round((values[i] / maxValue) * chartHeight);
                int y = chartBottom - barHeight;
                
                g2.setColor(colors[i % colors.length]);
                g2.fillRect(x, y, barWidth, barHeight);
                
                // Mostrar valor arriba de la barra
                g2.setColor(new java.awt.Color(226, 232, 240));
                g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 9));
                String valStr = String.format("%.1f", values[i]);
                int valStrWidth = g2.getFontMetrics().stringWidth(valStr);
                g2.drawString(valStr, x + (barWidth - valStrWidth) / 2, y - 5);
                
                // Mostrar etiqueta del eje X
                g2.setColor(new java.awt.Color(148, 163, 184));
                g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 9));
                int labelWidth = g2.getFontMetrics().stringWidth(labels[i]);
                g2.drawString(labels[i], x + (barWidth - labelWidth) / 2, chartBottom + 18);
            }
        }
        
        g2.dispose();
        return toByteArray(img);
    }

    private byte[] toByteArray(java.awt.image.BufferedImage img) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            javax.imageio.ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        } catch (IOException e) {
            e.printStackTrace();
            return new byte[0];
        }
    }
}
