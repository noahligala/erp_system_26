import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  useTheme,
  Stack,
  IconButton,
  Divider,
  Paper,
  Avatar,
} from "@mui/material";
import {
  SearchOutlined,
  LocationOnOutlined,
  WorkOutline,
  AccessTimeOutlined,
  ClearOutlined,
  WorkOffOutlined,
  BusinessCenterOutlined,
  ArrowForwardOutlined,
} from "@mui/icons-material";
import { DateTime } from "luxon";
import { apiClient } from "../../../api/apiClient";
import { tokens } from "../../../theme";

const Careers = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const { companyId } = useParams();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchPublicJobs = async () => {
      try {
        const response = await apiClient.get(`/public/companies/${companyId}/jobs`);
        if (response.data?.status === "success") {
          setJobs(Array.isArray(response.data.data) ? response.data.data : []);
        } else {
          setJobs([]);
        }
      } catch (error) {
        console.error("Failed to load jobs:", error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicJobs();
  }, [companyId]);

  const departments = useMemo(() => {
    const deps = jobs.map((job) => job?.department).filter(Boolean);
    return ["All", ...new Set(deps)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const title = job?.title?.toLowerCase() || "";
      const location = job?.location?.toLowerCase() || "";
      const description = job?.description?.toLowerCase() || "";

      const matchesSearch =
        !term ||
        title.includes(term) ||
        location.includes(term) ||
        description.includes(term);

      const matchesDepartment =
        selectedDepartment === "All" || job?.department === selectedDepartment;

      return matchesSearch && matchesDepartment;
    });
  }, [jobs, searchTerm, selectedDepartment]);

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Recently posted";
    const dt = DateTime.fromISO(dateString);
    return dt.isValid ? dt.toRelative() || "Recently posted" : "Recently posted";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("All");
  };

  const hasActiveFilters =
    searchTerm.trim().length > 0 || selectedDepartment !== "All";

  const getJobImage = (job) =>
    job?.image ||
    job?.image_url ||
    job?.cover_image ||
    job?.banner_image ||
    job?.background_image ||
    null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor:
          theme.palette.mode === "dark" ? colors.primary[500] : "#f9f9f9",
        pb: 10,
      }}
    >
      {/* HERO */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          pt: { xs: 8, md: 11 },
          pb: { xs: 12, md: 15 },
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${colors.primary[400]} 0%, ${colors.primary[600]} 100%)`
              : `linear-gradient(135deg, ${colors.blueAccent[700]} 0%, ${colors.blueAccent[500]} 100%)`,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 22%), radial-gradient(circle at 80% 30%, white 0, transparent 18%), radial-gradient(circle at 50% 80%, white 0, transparent 20%)",
          }}
        />

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Chip
              label="Careers"
              sx={{
                backgroundColor: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontWeight: 800,
                borderRadius: "999px",
                px: 1.5,
              }}
            />

            <Typography
              variant="h1"
              sx={{
                color: "#fff",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: { xs: "2.3rem", sm: "3rem", md: "4rem" },
                maxWidth: "900px",
                lineHeight: 1.05,
              }}
            >
              Join Our Team
            </Typography>

            <Typography
              variant="h4"
              sx={{
                color: "rgba(255,255,255,0.88)",
                fontWeight: 400,
                maxWidth: "760px",
                lineHeight: 1.6,
                fontSize: { xs: "1rem", md: "1.2rem" },
              }}
            >
              Discover open roles, explore where you fit best, and build meaningful
              work with us.
            </Typography>

            {!loading && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="center"
                useFlexGap
                sx={{ pt: 1 }}
              >
                <Chip
                  icon={<BusinessCenterOutlined sx={{ color: "#fff !important" }} />}
                  label={`${jobs.length} Open Position${jobs.length === 1 ? "" : "s"}`}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
                <Chip
                  label={`${departments.length - 1} Department${
                    departments.length - 1 === 1 ? "" : "s"
                  }`}
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              </Stack>
            )}
          </Stack>
        </Container>
      </Box>

      {/* FILTER PANEL */}
      <Container
        maxWidth="xl"
        sx={{
          mt: { xs: -10, md: -12 },
          position: "relative",
          zIndex: 2,
          mb: 5,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: "20px",
            p: { xs: 2, md: 2.25 },
            backgroundColor:
              theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
            border: `1px solid ${
              theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
            }`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 12px 32px rgba(0,0,0,0.28)"
                : "0 16px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by title, location, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined
                      sx={{
                        fontSize: 20,
                        color:
                          theme.palette.mode === "dark"
                            ? colors.grey[300]
                            : colors.grey[500],
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearchTerm("")}
                      size="small"
                      sx={{ p: 0.5 }}
                    >
                      <ClearOutlined fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 42,
                  borderRadius: "12px",
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? colors.primary[500]
                      : colors.primary[200],
                  color:
                    theme.palette.mode === "dark"
                      ? colors.grey[100]
                      : colors.grey[200],
                  "& fieldset": {
                    borderColor: colors.grey[700],
                  },
                  "&:hover fieldset": {
                    borderColor: colors.greenAccent[500],
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: colors.greenAccent[500],
                  },
                },
                "& .MuiOutlinedInput-input": {
                  py: 1,
                  px: 0.5,
                  fontSize: "0.92rem",
                },
              }}
            />

            {!loading && departments.length > 1 && (
              <>
                <Divider
                  sx={{
                    borderColor:
                      theme.palette.mode === "dark"
                        ? colors.grey[700]
                        : colors.grey[800],
                  }}
                />
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {departments.map((dept) => {
                      const selected = selectedDepartment === dept;

                      return (
                        <Chip
                          key={dept}
                          label={dept}
                          clickable
                          onClick={() => setSelectedDepartment(dept)}
                          sx={{
                            borderRadius: "999px",
                            fontWeight: selected ? 800 : 600,
                            color: selected
                              ? theme.palette.mode === "dark"
                                ? colors.primary[900]
                                : "#fff"
                              : colors.grey[200],
                            backgroundColor: selected
                              ? colors.greenAccent[500]
                              : theme.palette.mode === "dark"
                              ? colors.primary[500]
                              : colors.primary[200],
                            border: `1px solid ${
                              selected ? colors.greenAccent[500] : colors.grey[700]
                            }`,
                            "&:hover": {
                              backgroundColor: selected
                                ? colors.greenAccent[600]
                                : theme.palette.mode === "dark"
                                ? colors.primary[300]
                                : colors.primary[300],
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      startIcon={<ClearOutlined />}
                      sx={{
                        color: colors.greenAccent[500],
                        fontWeight: 700,
                        textTransform: "none",
                      }}
                    >
                      Reset filters
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      </Container>

      {/* RESULTS */}
      <Container maxWidth="xl">
        {!loading && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ mb: 3 }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: colors.grey[100],
              }}
            >
              {filteredJobs.length} Opportunit{filteredJobs.length === 1 ? "y" : "ies"} Found
            </Typography>

            {hasActiveFilters && (
              <Typography
                variant="body1"
                sx={{
                  color:
                    theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
                }}
              >
                Showing filtered results
              </Typography>
            )}
          </Stack>
        )}

        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={12}
          >
            <CircularProgress
              size={52}
              thickness={4}
              sx={{ color: colors.greenAccent[500] }}
            />
            <Typography
              variant="h5"
              sx={{
                mt: 2,
                color:
                  theme.palette.mode === "dark" ? colors.grey[200] : colors.grey[400],
              }}
            >
              Loading opportunities...
            </Typography>
          </Box>
        ) : filteredJobs.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2.5,
              justifyContent: { xs: "center", lg: "flex-start" },
            }}
          >
            {filteredJobs.map((job) => {
              const imageUrl = getJobImage(job);

              return (
                <Box
                  key={job.id}
                  sx={{
                    width: 320,
                    minWidth: 320,
                    maxWidth: 320,
                    flex: "0 0 320px",
                    display: "flex",
                  }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      width: 320,
                      minWidth: 320,
                      maxWidth: 320,
                      height: 430,
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: "20px",
                      overflow: "hidden",
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? colors.primary[400]
                          : colors.primary[100],
                      border: `1px solid ${
                        theme.palette.mode === "dark"
                          ? colors.grey[700]
                          : colors.grey[800]
                      }`,
                      transition: "all 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-6px)",
                        borderColor: colors.greenAccent[500],
                        boxShadow:
                          theme.palette.mode === "dark"
                            ? "0 18px 36px rgba(0,0,0,0.32)"
                            : "0 18px 36px rgba(15, 23, 42, 0.12)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: 135,
                        position: "relative",
                        background: imageUrl
                          ? `linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.52)), url(${imageUrl})`
                          : theme.palette.mode === "dark"
                          ? `linear-gradient(135deg, ${colors.primary[300]} 0%, ${colors.primary[500]} 100%)`
                          : `linear-gradient(135deg, ${colors.blueAccent[700]} 0%, ${colors.blueAccent[500]} 100%)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        p: 2,
                      }}
                    >
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "14px",
                          backgroundColor: "rgba(255,255,255,0.18)",
                          color: "#fff",
                          fontWeight: 800,
                          backdropFilter: "blur(6px)",
                          border: "1px solid rgba(255,255,255,0.18)",
                        }}
                      >
                        {job?.title?.charAt(0)?.toUpperCase() || "J"}
                      </Avatar>

                      <Box sx={{ minWidth: 72, display: "flex", justifyContent: "flex-end" }}>
                        {job.type ? (
                          <Chip
                            label={job.type}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              borderRadius: "999px",
                              backgroundColor: "rgba(255,255,255,0.18)",
                              color: "#fff",
                              backdropFilter: "blur(6px)",
                              border: "1px solid rgba(255,255,255,0.16)",
                            }}
                          />
                        ) : (
                          <Box sx={{ height: 24 }} />
                        )}
                      </Box>
                    </Box>

                    <CardContent
                      sx={{
                        p: 2.25,
                        flexGrow: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "calc(100% - 135px)",
                      }}
                    >
                      <Box sx={{ height: 56, mb: 1.25 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 800,
                            lineHeight: 1.2,
                            color: colors.grey[100],
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {job.title}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          height: 72,
                          mb: 1.5,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" minHeight={20}>
                          <LocationOnOutlined
                            fontSize="small"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[300]
                                  : colors.grey[500],
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[200]
                                  : colors.grey[400],
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {job.location || "Location not specified"}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" minHeight={20}>
                          <WorkOutline
                            fontSize="small"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[300]
                                  : colors.grey[500],
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[200]
                                  : colors.grey[400],
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {job.department || "General"}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" minHeight={20}>
                          <AccessTimeOutlined
                            fontSize="small"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[300]
                                  : colors.grey[500],
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[300]
                                  : colors.grey[500],
                            }}
                          >
                            {getRelativeTime(job.created_at)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box sx={{ height: 72, mb: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.86rem",
                            color:
                              theme.palette.mode === "dark"
                                ? colors.grey[200]
                                : colors.grey[400],
                            lineHeight: 1.55,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {job.description || "No description available for this role."}
                        </Typography>
                      </Box>

                      <Box sx={{ mt: "auto" }}>
                        <Divider
                          sx={{
                            mb: 1.5,
                            borderColor:
                              theme.palette.mode === "dark"
                                ? colors.grey[700]
                                : colors.grey[800],
                          }}
                        />
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.grey[400]
                                  : colors.grey[600],
                            }}
                          >
                            Public opening
                          </Typography>

                          <Button
                            variant="contained"
                            endIcon={<ArrowForwardOutlined />}
                            disableElevation
                            onClick={() => navigate(`/careers/${companyId}/${job.id}/apply`)}
                            sx={{
                              borderRadius: "12px",
                              px: 2,
                              py: 0.85,
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              textTransform: "none",
                              backgroundColor: colors.greenAccent[500],
                              color:
                                theme.palette.mode === "dark"
                                  ? colors.primary[900]
                                  : "#fff",
                              "&:hover": {
                                backgroundColor: colors.greenAccent[600],
                              },
                            }}
                          >
                            Apply Now
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Paper
            elevation={0}
            sx={{
              textAlign: "center",
              py: 10,
              px: 3,
              borderRadius: "20px",
              backgroundColor:
                theme.palette.mode === "dark" ? colors.primary[400] : colors.primary[100],
              border: `1px solid ${
                theme.palette.mode === "dark" ? colors.grey[700] : colors.grey[800]
              }`,
            }}
          >
            <WorkOffOutlined
              sx={{
                fontSize: 76,
                mb: 2,
                color:
                  theme.palette.mode === "dark" ? colors.grey[500] : colors.grey[700],
              }}
            />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 1.5,
                color: colors.grey[100],
              }}
            >
              No matching jobs found
            </Typography>
            <Typography
              variant="body1"
              sx={{
                maxWidth: 560,
                mx: "auto",
                mb: 3,
                lineHeight: 1.8,
                color:
                  theme.palette.mode === "dark" ? colors.grey[300] : colors.grey[500],
              }}
            >
              We could not find any opportunities matching your current search or
              department filter. Try broadening your search or clearing the filters.
            </Typography>

            {hasActiveFilters && (
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<ClearOutlined />}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: colors.greenAccent[500],
                  color: colors.greenAccent[500],
                  "&:hover": {
                    borderColor: colors.greenAccent[600],
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(76, 206, 172, 0.08)"
                        : "rgba(35, 168, 37, 0.08)",
                  },
                }}
              >
                Clear filters
              </Button>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default Careers;