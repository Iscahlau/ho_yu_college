# Ho Yu College Documentation Index

Welcome to the Ho Yu College documentation! This directory contains guides and resources for developers working on the platform.

## 📚 Documentation Overview

### Quick Start Guides

| Document | Purpose | Best For |
|----------|---------|----------|
| [Main README](../README.md) | Project overview and quick start | First-time setup |
| [Mock Server Guide](MOCK_SERVER_GUIDE.md) | Local development with Excel uploads | Testing uploads |
| [Database Quick Start](../backend/database/QUICK_START.md) | Fast database setup | Quick reference |

### Comprehensive Guides

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Mock Server Guide](MOCK_SERVER_GUIDE.md) | Complete local development setup | Full local environment |
| [Database README](../backend/database/README.md) | Detailed database documentation | Database management |
| [DataGrip Guide](../backend/database/DATAGRIP_GUIDE.md) | Visual database tool setup | Visual database work |
| [Copilot Instructions](../.github/copilot-instructions.md) | Development guidelines | Understanding project conventions |

## 🎯 Find Documentation By Task

### I want to...

#### Set up my development environment
1. Start with the [Main README](../README.md)
2. Follow [Database Quick Start](../backend/database/QUICK_START.md)
3. Review [Copilot Instructions](../.github/copilot-instructions.md) for conventions

#### Test Excel upload functionality
1. Read the [Mock Server Guide](MOCK_SERVER_GUIDE.md)
2. Use [Sample Excel Templates](sample-excel/)
3. Follow testing procedures in the guide

#### Work with the database
1. Choose database type: SQLite or PostgreSQL
2. Follow [Database README](../backend/database/README.md) for setup
3. Use [DataGrip Guide](../backend/database/DATAGRIP_GUIDE.md) for visual management

#### Understand the API
1. Review [Mock Server README](../backend/mock-server/README.md) for endpoints
2. Check [Mock Server Guide](MOCK_SERVER_GUIDE.md) for detailed API docs
3. Explore Lambda functions in `backend/lambda/` for AWS implementation

#### Debug issues
1. Check [Mock Server Guide - Troubleshooting](MOCK_SERVER_GUIDE.md#troubleshooting)
2. Review [Database README - Troubleshooting](../backend/database/README.md#troubleshooting)
3. Search [GitHub Issues](https://github.com/Iscahlau/ho_yu_college/issues)

#### Contribute to the project
1. Read [Main README - Contributing](../README.md#contributing)
2. Follow [Copilot Instructions](../.github/copilot-instructions.md)
3. Review existing code and tests

## 📖 Documentation Structure

```
ho_yu_college/
├── README.md                           # Project overview
├── docs/
│   ├── README.md                       # This file
│   ├── MOCK_SERVER_GUIDE.md           # Complete mock server & upload guide
│   └── sample-excel/                   # Excel/CSV templates
│       ├── README.md                   # Template usage guide
│       ├── students-template.csv       # Student data template
│       ├── teachers-template.csv       # Teacher data template
│       └── games-template.csv          # Game data template
├── backend/
│   ├── README.md                       # Backend overview
│   ├── database/
│   │   ├── INDEX.md                    # Database docs index
│   │   ├── README.md                   # Comprehensive database guide
│   │   ├── QUICK_START.md             # Fast setup reference
│   │   ├── DATAGRIP_GUIDE.md          # Visual database tool guide
│   │   └── MIGRATION_GUIDE.md         # Database migration instructions
│   ├── mock-server/
│   │   └── README.md                   # Mock server documentation
│   ├── lambda/
│   │   ├── README.md                   # Lambda functions overview
│   │   └── games/README.md             # Game click tracking docs
│   └── test/
│       ├── README.md                   # Testing documentation
│       └── MOCK_DATA_SUMMARY.md        # Mock data details
├── frontend/
│   └── src/
│       └── README.md                   # Frontend code documentation
└── .github/
    └── copilot-instructions.md         # Development guidelines
```

## 🔑 Key Resources

### Sample Files

All sample Excel/CSV templates for testing uploads:
- **Location:** [docs/sample-excel/](sample-excel/)
- **Includes:** Students, teachers, and games templates
- **Usage:** See [sample-excel/README.md](sample-excel/README.md)

### Database Files

Database setup scripts and SQL files:
- **Location:** `backend/database/`
- **Schema:** `backend/database/schema/01_create_tables.sql`
- **Seeds:** `backend/database/seeds/02_insert_mock_data.sql`
- **Scripts:** `backend/database/scripts/`

### Mock Data

Pre-populated test data for development:
- **Location:** `backend/test/mocks/`
- **Details:** See [backend/test/MOCK_DATA_SUMMARY.md](../backend/test/MOCK_DATA_SUMMARY.md)
- **Includes:** 10 students, 3 teachers, 20 games

## 🚀 Quick Links

### Setup & Configuration
- [Environment Requirements](MOCK_SERVER_GUIDE.md#environment-requirements)
- [Database Configuration](MOCK_SERVER_GUIDE.md#database-configuration)
- [Mock Server Setup](MOCK_SERVER_GUIDE.md#running-the-mock-server)

### Development
- [Local Development Guide](../README.md#local-development-with-mock-server)
- [Frontend Setup](../README.md#frontend-setup)
- [Backend Setup](../README.md#backend-setup)

### Testing
- [Excel Upload Testing](MOCK_SERVER_GUIDE.md#excel-upload-feature)
- [Test Scenarios](MOCK_SERVER_GUIDE.md#test-scenarios)
- [API Testing](MOCK_SERVER_GUIDE.md#api-documentation)

### Troubleshooting
- [Mock Server Issues](MOCK_SERVER_GUIDE.md#troubleshooting)
- [Database Issues](../backend/database/README.md#troubleshooting)
- [Common Problems](MOCK_SERVER_GUIDE.md#common-issues)

## 📝 Documentation Standards

When creating or updating documentation:

### ✅ Do
- Use clear, concise language
- Include code examples
- Provide step-by-step instructions
- Add troubleshooting sections
- Link to related documentation
- Update this index when adding new docs

### ❌ Don't
- Assume prior knowledge
- Skip error cases
- Leave broken links
- Duplicate content unnecessarily
- Commit sensitive information

## 🤝 Contributing to Documentation

To improve documentation:

1. **Identify gaps:** What's missing or unclear?
2. **Write content:** Follow existing documentation style
3. **Add examples:** Include practical code samples
4. **Test instructions:** Verify steps work as described
5. **Update index:** Add new docs to this index
6. **Submit PR:** Include clear description of changes

### Documentation Review Checklist

- [ ] Content is accurate and up-to-date
- [ ] Instructions have been tested
- [ ] Code examples work correctly
- [ ] Links are not broken
- [ ] Formatting is consistent
- [ ] Spelling and grammar checked
- [ ] Index updated if needed

## 📞 Getting Help

If you can't find what you're looking for:

1. **Search existing docs:** Use Ctrl+F or GitHub search
2. **Check issues:** See [GitHub Issues](https://github.com/Iscahlau/ho_yu_college/issues)
3. **Ask team:** Contact development team
4. **Create issue:** If documentation is missing, create an issue

## 🔄 Recent Updates

| Date | Document | Change |
|------|----------|--------|
| 2024-10 | MOCK_SERVER_GUIDE.md | Created comprehensive mock server and Excel upload guide |
| 2024-10 | sample-excel/ | Added CSV templates for students, teachers, and games |
| 2024-10 | README.md | Created documentation index |

## 📚 External Resources

### Technologies Used
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)

### Database
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DataGrip Documentation](https://www.jetbrains.com/help/datagrip/)

### Tools
- [Docker Documentation](https://docs.docker.com/)
- [Git Documentation](https://git-scm.com/doc)
- [npm Documentation](https://docs.npmjs.com/)

---

**Last Updated:** October 2024  
**Maintained By:** Ho Yu College Development Team  
**License:** Educational Use Only
