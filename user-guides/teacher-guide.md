# Teacher User Guide
## Ho Yu College Scratch Game Platform

Welcome to the Ho Yu College Scratch Game Platform! This guide will help you manage students, upload game content, and monitor student progress.

---

## 📱 Getting Started

### Logging In

1. Open the platform website in your web browser
2. You will see the login page
3. Enter your **Teacher ID** (provided by administration)
4. Enter your **Password** (provided by administration)
5. Click the **Login** button

After successful login, you will be directed to the **Admin Panel** where you can manage the platform.

> 💡 **Tip**: Keep your credentials secure and do not share them with students.

---

## 🎯 Admin Panel Overview

The Admin Panel is your control center with three main sections:

### 1. Upload Section
Upload data for students, teachers, and games using Excel files.

### 2. Download Section
Download existing data to Excel files for review or backup.

### 3. Management Cards
Quick access to upload and download functions for:
- **Students** (student accounts and information)
- **Teachers** (teacher accounts)
- **Games** (Scratch game information)

---

## 📤 Uploading Data

### Supported File Formats

You can upload data using these file formats:
- **Excel files**: `.xlsx`, `.xls`
- **CSV files**: `.csv`

### File Requirements

- **Maximum file size**: 10 MB
- **Maximum records per file**: 4,000 rows
- **File must not be empty**
- **First row should contain column headers**

### Uploading Student Data

**Required columns in your Excel file**:
- `student_id`: Unique ID for each student (e.g., S001, S002)
- `name_1`: Student's first name or full name
- `name_2`: Student's additional name (optional, can be empty)
- `class`: Class name (e.g., 1A, 2B, 3C)
- `password`: Login password for the student

**Steps to upload**:
1. In the Admin Panel, find the **Students** card
2. Click **Upload Data** or the upload icon
3. Click **Choose File** and select your Excel file
4. Wait for the file to be validated and uploaded
5. You will see a success message if the upload completes
6. If there are errors, review the error messages and fix your file

**Example Excel format**:
| student_id | name_1 | name_2 | class | password |
|------------|--------|--------|-------|----------|
| S001 | John | Smith | 1A | student123 |
| S002 | Mary | Wong | 1A | mary2024 |
| S003 | Peter | Chan | 2B | peter456 |

> ⚠️ **Important Notes**:
> - Student IDs must be unique
> - Passwords should be simple enough for young students to remember
> - Consider using a consistent password format for easier management

### Uploading Teacher Data

**Required columns in your Excel file**:
- `teacher_id`: Unique ID for each teacher (e.g., T001, T002)
- `name_1`: Teacher's first name or full name
- `name_2`: Teacher's additional name (optional, can be empty)
- `responsible_class`: Classes the teacher is responsible for (separate multiple classes with commas)
- `password`: Login password for the teacher
- `is_admin`: Whether the teacher has admin privileges (`yes`, `true`, or `1` for admin; otherwise regular teacher)

**Steps to upload**:
1. In the Admin Panel, find the **Teachers** card
2. Click **Upload Data** or the upload icon
3. Click **Choose File** and select your Excel file
4. Wait for the file to be validated and uploaded
5. Review success or error messages

**Example Excel format**:
| teacher_id | name_1 | name_2 | responsible_class | password | is_admin |
|------------|--------|--------|-------------------|----------|----------|
| T001 | Sarah | Lee | 1A,1B,1C | teacher123 | yes |
| T002 | David | Wong | 2A,2B | david2024 | no |

> 💡 **Admin Privileges**: Teachers with admin rights can upload/manage all data. Regular teachers have limited access.

### Uploading Game Data

**Required columns in your Excel file**:
- `game_id`: Must match the Scratch project ID from the Scratch URL
- `game_name`: Name or title of the game
- `scratch_api`: Full Scratch project URL (e.g., https://scratch.mit.edu/projects/1168960672)
- `description`: Brief description of the game (optional)
- `difficulty`: Game difficulty level - must be one of: `Beginner`, `Intermediate`, or `Advanced`
- `class`: Target class for the game (optional, can be empty for all classes)

**Steps to upload**:
1. In the Admin Panel, find the **Games** card
2. Click **Upload Data** or the upload icon
3. Click **Choose File** and select your Excel file
4. Wait for the file to be validated and uploaded
5. Review success or error messages

**Example Excel format**:
| game_id | game_name | scratch_api | description | difficulty | class |
|---------|-----------|-------------|-------------|------------|-------|
| 1168960672 | Maze Runner | https://scratch.mit.edu/projects/1168960672 | Navigate through the maze | Beginner | 1A |
| 104 | Catch Game | https://scratch.mit.edu/projects/104 | Catch falling objects | Intermediate | |

> ⚠️ **Critical**: The `game_id` MUST match the number at the end of the `scratch_api` URL!
> - ✅ Correct: game_id=`1168960672`, scratch_api=`https://scratch.mit.edu/projects/1168960672`
> - ❌ Wrong: game_id=`123`, scratch_api=`https://scratch.mit.edu/projects/1168960672`

### Finding Scratch Game URLs

To get the correct Scratch project URL:

1. Go to [scratch.mit.edu](https://scratch.mit.edu)
2. Search for or browse to find a game you want to add
3. Click on the game to open it
4. Look at the browser address bar - you'll see a URL like:
   `https://scratch.mit.edu/projects/1168960672`
5. Copy this entire URL to use as the `scratch_api` value
6. The number at the end (`1168960672`) is your `game_id`

### Upload Tips

- **Test with a small file first** (5-10 rows) to make sure the format is correct
- **Back up your data** before uploading large batches
- **Review error messages carefully** - they tell you exactly which rows have problems
- **Upload happens in batches** of 25 records at a time for reliability
- **Large uploads may take a minute or two** - be patient and don't close the browser

---

## 📥 Downloading Data

You can download existing data from the platform to Excel files for review, backup, or editing.

### Downloading Student Data

1. In the Admin Panel, find the **Students** card
2. Click **Download Data** or the download icon
3. An Excel file will be downloaded to your computer
4. The file name will include the date and time (e.g., `students_2025-10-28.xlsx`)

**Downloaded file includes**:
- All student records (student_id, name, class, etc.)
- Current marks for each student
- Login information
- Timestamps (when created, last updated)

### Downloading Teacher Data

1. In the Admin Panel, find the **Teachers** card
2. Click **Download Data** or the download icon
3. An Excel file will be downloaded to your computer

**Downloaded file includes**:
- All teacher records
- Responsible classes
- Admin status
- Timestamps

### Downloading Game Data

1. In the Admin Panel, find the **Games** card
2. Click **Download Data** or the download icon
3. An Excel file will be downloaded to your computer

**Downloaded file includes**:
- All game information
- Click counts (how many times each game has been played)
- Difficulty levels
- Assigned classes
- Timestamps

### Uses for Downloaded Data

- **Review**: Check current data in the system
- **Backup**: Keep copies of your data
- **Edit**: Download, modify in Excel, and re-upload updated data
- **Reports**: Use the data for attendance or progress reports
- **Planning**: Analyze which games are most popular (click counts)

---

## 👥 Managing Student Accounts

### Creating New Students

1. Prepare an Excel file with student information (see format above)
2. Upload the file through the Admin Panel
3. Students can immediately log in with their assigned credentials

### Updating Student Information

1. Download the current student data
2. Edit the Excel file with updated information
3. Re-upload the file - existing records will be updated

### Resetting Student Passwords

1. Download student data
2. Change the password in the Excel file
3. Re-upload the file
4. Inform the student of their new password

---

## 🎮 Managing Games

### Adding New Games

1. Find suitable Scratch games at [scratch.mit.edu](https://scratch.mit.edu)
2. Note the project URL and ID
3. Prepare an Excel file with game information
4. Upload through the Admin Panel
5. Games immediately become available to students

### Assigning Games to Classes

- In the `class` column of your games Excel file, specify which class(es) should see the game
- Leave blank to make the game available to all students
- Students can filter games by their class on the homepage

### Updating Game Information

1. Download current game data
2. Edit information (name, description, difficulty, class assignment)
3. Re-upload the file

> 💡 **Tip**: Keep the Scratch API URL and game_id unchanged when updating. Only modify other fields like name or difficulty.

---

## 📊 Monitoring Student Progress

### Viewing Play Statistics

When you download student data, you can see:
- **Total marks** earned by each student
- Play time and engagement levels

When you download game data, you can see:
- **Click counts** - how many times each game has been played
- Popular games (high click counts)
- Unused games (zero or low clicks)

### Understanding the Marking System

Students earn marks based on:
- **Play time** (in minutes)
- **Game difficulty**

**Marking formula**: `Minutes Played × Difficulty Multiplier`

**Multipliers**:
- Beginner: ×1
- Intermediate: ×2
- Advanced: ×3

**Examples**:
- 10 minutes on Beginner = 10 marks
- 15 minutes on Intermediate = 30 marks
- 20 minutes on Advanced = 60 marks

---

## 🔧 Troubleshooting

### Upload Issues

**Problem**: "File format not supported"
- **Solution**: Make sure you're using .xlsx, .xls, or .csv format

**Problem**: "File too large"
- **Solution**: Split your data into multiple files, each under 10 MB

**Problem**: "Too many records"
- **Solution**: Limit each file to 4,000 rows maximum

**Problem**: "File is empty"
- **Solution**: Ensure your file has data rows (not just headers)

**Problem**: "Invalid game_id format"
- **Solution**: Make sure the game_id matches the Scratch project ID exactly

**Problem**: Some records failed to upload
- **Solution**: Check the error message for specific rows, fix those records, and re-upload

### Download Issues

**Problem**: Download doesn't start
- **Solution**: Check your browser's pop-up blocker settings

**Problem**: Downloaded file won't open
- **Solution**: Make sure you have Excel or a compatible spreadsheet program installed

### Login Issues

**Problem**: Can't log in as teacher
- **Solution**: Double-check your teacher_id and password. Contact admin if issues persist.

---

## 🌐 Language Support

The platform supports two languages:
- **English**
- **繁體中文 (Traditional Chinese)**

Both you and your students can switch languages using the language selector in the top navigation bar.

---

## 💡 Best Practices

### Data Management
- **Regular backups**: Download data weekly for backup
- **Plan ahead**: Prepare Excel files carefully before uploading
- **Test small**: Try uploading 5-10 records first to verify format
- **Document passwords**: Keep a secure record of student passwords

### Game Management
- **Age-appropriate**: Choose Scratch games suitable for your students' age and skill level
- **Clear difficulty**: Assign difficulty levels accurately to ensure fair marking
- **Variety**: Include games of different types and difficulty levels
- **Test games**: Try playing games yourself before assigning to students

### Student Support
- **Clear instructions**: Provide students with their login credentials clearly
- **Simple passwords**: Use easy-to-remember passwords for young students
- **Help available**: Be available to help students with login or technical issues

---

## 📞 Need Help?

If you encounter issues or need assistance:

1. **Check this guide** for common solutions
2. **Review error messages** carefully - they often explain the problem
3. **Try again** with a smaller test file
4. **Contact technical support** if problems persist

---

## 📋 Quick Reference

### Excel File Requirements
- **Formats**: .xlsx, .xls, .csv
- **Max size**: 10 MB
- **Max rows**: 4,000
- **Must include**: Column headers in first row

### Required Columns

**Students**: `student_id`, `name_1`, `name_2`, `class`, `password`

**Teachers**: `teacher_id`, `name_1`, `name_2`, `responsible_class`, `password`, `is_admin`

**Games**: `game_id`, `game_name`, `scratch_api`, `description`, `difficulty`, `class`

### Difficulty Levels
- Beginner (×1 multiplier)
- Intermediate (×2 multiplier)
- Advanced (×3 multiplier)

---

**Good luck managing the platform! 🎓**

Your efforts help create an engaging learning environment for students!
