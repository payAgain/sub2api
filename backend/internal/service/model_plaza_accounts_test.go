//go:build unit

package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type plazaAccountRepository struct {
	AccountRepository
	accounts []Account
	err      error
}

func (r *plazaAccountRepository) ListActive(context.Context) ([]Account, error) {
	return r.accounts, r.err
}

func plazaAccount(id int64, group int64, models map[string]any) Account {
	return Account{ID: id, Platform: PlatformOpenAI, Status: StatusActive, GroupIDs: []int64{group}, Credentials: map[string]any{"api_key": "private-credential", "model_mapping": models}}
}

func TestListPlazaGroups_CurrentAccountsSuccessiveEdits(t *testing.T) {
	accounts := &plazaAccountRepository{accounts: []Account{plazaAccount(1, 15, map[string]any{"hy4-preview": "private-target"})}}
	channels := []Channel{plazaPricedChannel(1, "stale", []int64{15}, PlatformOpenAI, "old-glm", "hy4-preview")}
	groups := []Group{{ID: 15, Name: "old", Platform: PlatformOpenAI}, {ID: 17, Name: "new", Platform: PlatformOpenAI}}
	svc := NewModelPlazaService(&mockChannelRepository{listAllFn: func(context.Context) ([]Channel, error) { return channels, nil }}, &stubGroupRepoForAvailable{activeGroups: groups}, nil, nil, nil, accounts)
	check := func(want map[int64][]string) {
		t.Helper()
		out, err := svc.ListGroups(context.Background())
		require.NoError(t, err)
		got := map[int64][]string{}
		for _, g := range out {
			for _, m := range g.Models {
				got[g.ID] = append(got[g.ID], m.Name)
			}
		}
		require.Equal(t, want, got)
		encoded, err := json.Marshal(out)
		require.NoError(t, err)
		require.NotContains(t, string(encoded), "private-target")
		require.NotContains(t, string(encoded), "private-credential")
	}
	check(map[int64][]string{15: {"hy4-preview"}})
	// In-place model edits must be visible without recreating the service.
	mapping := accounts.accounts[0].Credentials["model_mapping"].(map[string]any)
	delete(mapping, "hy4-preview")
	mapping["step-5-preview"] = "private-target"
	check(map[int64][]string{15: {"step-5-preview"}})
	accounts.accounts = append(accounts.accounts, plazaAccount(2, 15, map[string]any{"kimi-k3-1": "private-target", "gpt-5.6": "private-target"}))
	check(map[int64][]string{15: {"gpt-5.6", "kimi-k3-1", "step-5-preview"}})
	accounts.accounts[0].GroupIDs = []int64{17}
	check(map[int64][]string{15: {"gpt-5.6", "kimi-k3-1"}, 17: {"step-5-preview"}})
	accounts.accounts = accounts.accounts[:1]
	check(map[int64][]string{17: {"step-5-preview"}})
	accounts.accounts[0].Status = StatusDisabled
	check(map[int64][]string{})
	accounts.accounts = nil
	check(map[int64][]string{})
}

func TestListPlazaGroups_ExplicitAliasesAndExactNames(t *testing.T) {
	accounts := &plazaAccountRepository{accounts: []Account{
		plazaAccount(1, 15, map[string]any{
			"gpt-6-astra": "Astra6破甲", "Astra6破甲": "Astra6破甲",
			"kimi-k3": "kimik3-破甲", "kimik3-破甲": "kimik3-破甲",
			"another-alias": "Astra6破甲", "Raw-New-Identifier": "Raw-New-Identifier",
			"literal alias": "private-upstream", "*": "private-upstream", "gpt-*": "private-upstream",
			"": "bad", "invalid": 42,
		}),
		plazaAccount(2, 15, map[string]any{"gpt-6-astra": "different-private-target"}),
	}}
	svc := NewModelPlazaService(&mockChannelRepository{listAllFn: func(context.Context) ([]Channel, error) { return nil, nil }}, &stubGroupRepoForAvailable{activeGroups: []Group{{ID: 15, Platform: PlatformOpenAI}}}, nil, nil, nil, accounts)
	out, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out, 1)
	names := []string{}
	for _, m := range out[0].Models {
		names = append(names, m.Name)
	}
	require.Equal(t, []string{"Raw-New-Identifier", "another-alias", "gpt-6-astra", "kimi-k3", "literal alias"}, names)
	// Identity is hidden only within its own account: another account may publish it.
	accounts.accounts = append(accounts.accounts, plazaAccount(3, 15, map[string]any{"Astra6破甲": "Astra6破甲"}))
	out, err = svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out[0].Models, 6)
	require.Equal(t, "Astra6破甲", out[0].Models[0].Name)
}

func TestListPlazaGroups_AccountsPreserveChannelAliasPricing(t *testing.T) {
	channel := plazaPricedChannel(1, "price", []int64{15}, PlatformOpenAI, "priced-target")
	channel.ModelMapping = map[string]map[string]string{PlatformOpenAI: {"public-alias": "priced-target"}}
	accounts := &plazaAccountRepository{accounts: []Account{plazaAccount(1, 15, map[string]any{"public-alias": "private-target"})}}
	svc := NewModelPlazaService(&mockChannelRepository{listAllFn: func(context.Context) ([]Channel, error) { return []Channel{channel}, nil }}, &stubGroupRepoForAvailable{activeGroups: []Group{{ID: 15, Platform: PlatformOpenAI}}}, nil, nil, nil, accounts)
	out, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out, 1)
	require.Len(t, out[0].Models, 1)
	require.NotNil(t, out[0].Models[0].Pricing)
	require.Equal(t, channel.ModelPricing[0].InputPrice, out[0].Models[0].Pricing.InputPrice)
}

func TestListPlazaGroups_AccountCatalogBoundaries(t *testing.T) {
	groups := []Group{{ID: 15, Name: "openai", Platform: PlatformOpenAI}, {ID: 17, Name: "composite", Platform: PlatformComposite}, {ID: 19, Name: "anthropic", Platform: PlatformAnthropic}}
	paused := plazaAccount(1, 15, map[string]any{"same": "upstream"})
	paused.GroupIDs = []int64{15, 17, 19, 99}
	anthropic := plazaAccount(2, 17, map[string]any{"same": "upstream"})
	anthropic.Platform = PlatformAnthropic
	empty := plazaAccount(3, 15, nil)
	empty.Platform = PlatformAntigravity // Runtime defaults must not fabricate catalog IDs.
	wildcard := plazaAccount(4, 15, map[string]any{"*": "*", "anything-*": "target"})
	inactive := plazaAccount(5, 15, map[string]any{"inactive": "target"})
	inactive.Status = StatusDisabled
	accounts := &plazaAccountRepository{accounts: []Account{wildcard, paused, inactive, empty, anthropic, paused}}
	svc := NewModelPlazaService(&mockChannelRepository{listAllFn: func(context.Context) ([]Channel, error) {
		return []Channel{plazaPricedChannel(1, "stale", []int64{15, 17, 19}, PlatformOpenAI, "stale-model")}, nil
	}}, &stubGroupRepoForAvailable{activeGroups: groups}, nil, nil, nil, accounts)
	out, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out, 2)
	require.Equal(t, int64(17), out[0].ID)
	require.Len(t, out[0].Models, 2)
	require.Equal(t, PlatformAnthropic, out[0].Models[0].Platform)
	require.Equal(t, PlatformOpenAI, out[0].Models[1].Platform)
	require.Equal(t, int64(15), out[1].ID)
	require.Len(t, out[1].Models, 1)
	require.Equal(t, "same", out[1].Models[0].Name)
	accounts.accounts = []Account{empty, wildcard}
	out, err = svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Empty(t, out)
}

func TestListPlazaGroups_AccountCatalogKeepsBillingResolution(t *testing.T) {
	channel := plazaPricedChannel(1, "billing", []int64{15}, PlatformOpenAI, "stale-model")
	group := Group{ID: 15, Platform: PlatformOpenAI, LongContextPricingEnabled: true}
	svc := newPlazaServiceWithBilling([]Channel{channel}, []Group{group}, map[int64]string{15: PlatformOpenAI}, newStubPricingServiceFromJSON(t, openAILadderCatalogJSON))
	svc.accountRepo = &plazaAccountRepository{accounts: []Account{plazaAccount(1, 15, map[string]any{"gpt-5.4": "private-target"})}}
	out, err := svc.ListGroups(context.Background())
	require.NoError(t, err)
	require.Len(t, out, 1)
	require.Len(t, out[0].Models, 1)
	model := out[0].Models[0]
	require.Equal(t, "gpt-5.4", model.Name)
	require.NotNil(t, model.Pricing)
	require.InDelta(t, 2.5e-6, *model.Pricing.InputPrice, 1e-15)
	require.Len(t, model.Pricing.Intervals, 2)
	require.NotNil(t, model.OfficialPricing)
	require.Len(t, model.OfficialPricing.Intervals, 2)
}

func TestListPlazaGroups_AccountRepositoryError(t *testing.T) {
	sentinel := errors.New("accounts unavailable")
	accounts := &plazaAccountRepository{err: sentinel}
	svc := NewModelPlazaService(&mockChannelRepository{listAllFn: func(context.Context) ([]Channel, error) { return nil, nil }}, &stubGroupRepoForAvailable{}, nil, nil, nil, accounts)
	out, err := svc.ListGroups(context.Background())
	require.Nil(t, out)
	require.ErrorIs(t, err, sentinel)
}
